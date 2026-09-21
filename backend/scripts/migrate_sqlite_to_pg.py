"""
Data Migration Utility: SQLite -> PostgreSQL (Production Database)
Standalone script - does NOT import main.py. Connects directly via SQLAlchemy.

Usage:
    python migrate_sqlite_to_pg.py            # Full migration
    python migrate_sqlite_to_pg.py --dry-run  # Preview only
"""

import argparse
import os
import sys
import traceback

# Load .env from same directory
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
except ImportError:
    pass

from sqlalchemy import JSON, Column, Integer, String, create_engine, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()

# ── ORM Models (mirrors main.py) ──────────────────────────────────────────────

class SessionMeta(Base):
    __tablename__ = "session_meta"
    session_id = Column(String, primary_key=True)
    locked = Column(Integer, default=0)
    timestamp = Column(String)

class ConsentRecord(Base):
    __tablename__ = "consents"
    session_id = Column(String, primary_key=True)
    abha_id = Column(String)
    name = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    dob = Column(String, nullable=True)
    abha_address = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    profile_data = Column(JSON, nullable=True)
    status = Column(String, default="granted")
    timestamp = Column(String)

class AyushResult(Base):
    __tablename__ = "ayush_results"
    session_id = Column(String, primary_key=True)
    prakriti = Column(String)
    agni = Column(String)
    koshtha = Column(String)
    raw_tally = Column(JSON)
    timestamp = Column(String)

class IntakeResult(Base):
    __tablename__ = "intake_results"
    session_id = Column(String, primary_key=True)
    intake_type = Column(String)
    summary = Column(JSON)
    flags = Column(JSON)
    timestamp = Column(String)

class PhysicianReview(Base):
    __tablename__ = "physician_reviews"
    session_id = Column(String, primary_key=True)
    physician_id = Column(String, default="physician-1")
    notes = Column(String, nullable=True)
    verified = Column(Integer, default=0)
    urgency = Column(String, default="routine")
    critical = Column(Integer, default=0)
    red_flags = Column(JSON)
    timestamp = Column(String)

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True)
    session_id = Column(String)
    raw_text = Column(String)
    parsed_data = Column(JSON)
    timestamp = Column(String)


MODELS = [
    ("SessionMeta",     SessionMeta,     "session_id"),
    ("ConsentRecord",   ConsentRecord,   "session_id"),
    ("AyushResult",     AyushResult,     "session_id"),
    ("IntakeResult",    IntakeResult,    "session_id"),
    ("PhysicianReview", PhysicianReview, "session_id"),
    ("Document",        Document,        "id"),
]

# ─────────────────────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser(description="Migrate SQLite -> PostgreSQL")
    p.add_argument("--source-sqlite", default=os.path.join(os.path.dirname(__file__), "data", "ayush.db"))
    p.add_argument("--target-url", default=os.getenv("DATABASE_URL", "").strip())
    p.add_argument("--dry-run", action="store_true")
    return p.parse_args()


def run():
    args = parse_args()
    sqlite_path = args.source_sqlite
    target_url  = args.target_url

    print("=" * 65)
    print("  SQLITE -> PRODUCTION POSTGRES MIGRATION")
    print("=" * 65)

    if not os.path.exists(sqlite_path):
        print(f"[ERROR] SQLite file not found: {sqlite_path}")
        sys.exit(1)

    if not target_url:
        print("[ERROR] DATABASE_URL is empty. Set it in .env or pass --target-url.")
        sys.exit(1)

    if target_url.startswith("postgres://"):
        target_url = target_url.replace("postgres://", "postgresql://", 1)

    masked = target_url.split("@")[-1] if "@" in target_url else target_url
    print(f"[Source] {sqlite_path}")
    print(f"[Target] {masked}")
    if args.dry_run:
        print("[Mode]   DRY RUN - nothing will be written")

    # Source SQLite engine
    src_engine = create_engine(
        f"sqlite:///{sqlite_path.replace(os.sep, '/')}",
        connect_args={"check_same_thread": False}
    )
    SrcSession = sessionmaker(bind=src_engine)

    # Target PostgreSQL engine
    # Strip sslmode from URL (psycopg2 needs it in connect_args, not the URL)
    from urllib.parse import parse_qs, urlencode, urlparse, urlunparse
    parsed = urlparse(target_url)
    qs = parse_qs(parsed.query)
    sslmode = qs.pop("sslmode", ["require"])[0]
    clean_url = urlunparse(parsed._replace(query=urlencode({k: v[0] for k, v in qs.items()})))

    tgt_engine = create_engine(
        clean_url,
        connect_args={"connect_timeout": 15, "sslmode": sslmode},
        pool_pre_ping=False
    )
    TgtSession = sessionmaker(bind=tgt_engine)

    if not args.dry_run:
        print("\n[Schema] Creating tables on target...")
        Base.metadata.create_all(bind=tgt_engine)
        print("[Schema] OK")

    src_db = SrcSession()
    tgt_db = TgtSession()
    summary = []

    try:
        for model_name, model_cls, pk_field in MODELS:
            src_inspector = inspect(src_engine)
            if not src_inspector.has_table(model_cls.__tablename__):
                summary.append({"model": model_name, "source": 0, "migrated": 0, "skipped": 0})
                continue

            records = src_db.query(model_cls).all()
            total_source = len(records)

            if args.dry_run:
                summary.append({"model": model_name, "source": total_source, "migrated": total_source, "skipped": 0})
                continue

            if total_source == 0:
                summary.append({"model": model_name, "source": 0, "migrated": 0, "skipped": 0})
                continue

            # Get existing PKs from target to detect duplicates
            tgt_inspector = inspect(tgt_engine)
            existing_pks = set()
            if tgt_inspector.has_table(model_cls.__tablename__):
                with tgt_engine.connect() as check_conn:
                    result = check_conn.execute(
                        text(f'SELECT "{pk_field}" FROM {model_cls.__tablename__}')
                    )
                    existing_pks = {str(r[0]) for r in result}

            # Build list of new records only (skip duplicates)
            cols = [c.name for c in model_cls.__table__.columns]
            new_rows = []
            for rec in records:
                pk_val = str(getattr(rec, pk_field))
                if pk_val in existing_pks:
                    continue
                new_rows.append({col: getattr(rec, col) for col in cols})

            skipped = total_source - len(new_rows)
            inserted = 0

            if new_rows:
                # Bulk insert in one transaction
                with tgt_engine.begin() as bulk_conn:
                    bulk_conn.execute(model_cls.__table__.insert(), new_rows)
                inserted = len(new_rows)

            summary.append({
                "model": model_name,
                "source": total_source,
                "migrated": inserted,
                "skipped": skipped
            })
            print(f"  [{model_name}] {inserted} inserted, {skipped} skipped")

        print(f"\n{'Table':<22} {'Source':>7} {'Migrated':>10} {'Skipped':>9}")
        print("-" * 55)
        for row in summary:
            m = f"{row['migrated']} (dry)" if args.dry_run else row['migrated']
            print(f"{row['model']:<22} {row['source']:>7} {str(m):>10} {row['skipped']:>9}")

        total_migrated = sum(r['migrated'] for r in summary)
        print("-" * 55)
        if args.dry_run:
            print(f"\n[Dry Run Complete] {total_migrated} records ready for migration.")
        else:
            print(f"\n[SUCCESS] {total_migrated} records migrated to production database!")

    except Exception as e:
        if not args.dry_run:
            tgt_db.rollback()
        print(f"\n[ERROR] {e}")
        traceback.print_exc()
    finally:
        src_db.close()
        tgt_db.close()


if __name__ == "__main__":
    run()
