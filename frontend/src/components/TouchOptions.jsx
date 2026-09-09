import React, { useState } from 'react';
import { CheckCircle2, Check, X } from 'lucide-react';

// Helper to extract primary label & secondary subtitle
const getLabels = (opt, lang) => {
  let primary = '';
  let sub = '';

  if (lang === 'hi') {
    primary = opt.label_hi || opt.label || opt.text || opt.value || opt.id;
    sub = opt.label_en || opt.value;
  } else if (lang === 'mr') {
    primary = opt.label_mr || opt.label_hi || opt.label || opt.text || opt.value || opt.id;
    sub = opt.label_en || opt.value;
  } else {
    primary = opt.label_en || opt.label || opt.text || opt.value || opt.id;
    sub = opt.label_hi || '';
  }

  // Strip any accidental emojis in label text
  primary = primary ? primary.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F600}-\u{1F64F}]/gu, '').trim() : '';
  sub = sub ? sub.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F600}-\u{1F64F}]/gu, '').trim() : '';

  // Avoid identical sub label
  if (sub && sub.trim().toLowerCase() === primary.trim().toLowerCase()) {
    sub = '';
  }

  return { primary, sub };
};

// ─── Single-select chip grid ─────────────────────────────────────────────────
function ChipGrid({ options, lang, onSelect, disabled }) {
  const [chosen, setChosen] = useState(null);

  const handle = (opt) => {
    if (disabled) return;
    setChosen(opt.id);
    const { primary } = getLabels(opt, lang);
    const valueToSend = (lang === 'hi' ? (opt.label_hi || primary) : lang === 'mr' ? (opt.label_mr || primary) : (opt.label_en || primary)) || opt.value || opt.id;
    setTimeout(() => onSelect(valueToSend), 180);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
      {options.map((opt) => {
        const { primary, sub } = getLabels(opt, lang);
        const isSelected = chosen === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => handle(opt)}
            disabled={disabled || chosen !== null}
            className={`flex items-center justify-between gap-3 p-4 rounded-2xl border text-left transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-xs ${
              isSelected
                ? 'bg-teal-600 border-teal-600 text-white shadow-md shadow-teal-700/20 scale-[1.01]'
                : 'bg-white/95 border-slate-200/90 text-slate-800 hover:border-teal-500 hover:bg-teal-50/40 hover:shadow-sm'
            }`}
          >
            <div className="flex flex-col min-w-0 flex-1">
              <span className={`text-sm sm:text-base font-semibold leading-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                {primary}
              </span>
              {sub && (
                <span className={`text-xs leading-tight truncate mt-1 ${isSelected ? 'text-teal-100' : 'text-slate-500 font-medium'}`}>
                  {sub}
                </span>
              )}
            </div>
            {isSelected && (
              <CheckCircle2 className="w-5 h-5 text-white shrink-0 animate-in zoom-in-50 duration-150" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Multi-select chip grid ───────────────────────────────────────────────────
function MultiChipGrid({ options, lang, onSelect, disabled }) {
  const [chosen, setChosen] = useState(new Set());
  const [confirmed, setConfirmed] = useState(false);

  const CONFIRM_LABELS = {
    en: 'Confirm Selection',
    hi: 'चुनाव पक्का करें',
    mr: 'निवड पक्की करा',
  };

  const toggle = (opt) => {
    if (disabled || confirmed) return;
    setChosen((prev) => {
      const next = new Set(prev);
      if (opt.id === 'none' || opt.id.startsWith('none') || opt.id.startsWith('all_') || opt.id === 'fam_none') {
        return next.has(opt.id) ? new Set() : new Set([opt.id]);
      }
      if (next.has(opt.id)) {
        next.delete(opt.id);
      } else {
        ['none','none_gen','none_hist','none_soc','none_chest','fam_none','all_fine'].forEach(ex => next.delete(ex));
        next.add(opt.id);
      }
      return next;
    });
  };

  const confirm = () => {
    if (chosen.size === 0 || confirmed) return;
    setConfirmed(true);
    const labels = options
      .filter((o) => chosen.has(o.id))
      .map((o) => {
        const { primary } = getLabels(o, lang);
        return primary;
      })
      .join(', ');
    setTimeout(() => onSelect(labels), 180);
  };

  return (
    <div className="flex flex-col gap-2.5 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {options.map((opt) => {
          const { primary, sub } = getLabels(opt, lang);
          const isSelected = chosen.has(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt)}
              disabled={disabled || confirmed}
              className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border text-left transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-xs ${
                isSelected
                  ? 'bg-teal-600 border-teal-600 text-white shadow-md shadow-teal-700/20'
                  : 'bg-white/95 border-slate-200/90 text-slate-800 hover:border-teal-500 hover:bg-teal-50/40 hover:shadow-sm'
              }`}
            >
              <div className="flex flex-col min-w-0 flex-1">
                <span className={`text-sm sm:text-base font-semibold leading-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                  {primary}
                </span>
                {sub && (
                  <span className={`text-xs leading-tight truncate mt-1 ${isSelected ? 'text-teal-100' : 'text-slate-500 font-medium'}`}>
                    {sub}
                  </span>
                )}
              </div>
              <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                isSelected ? 'bg-white border-white text-teal-700' : 'border-slate-300 bg-slate-50'
              }`}>
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </button>
          );
        })}
      </div>
      {chosen.size > 0 && !confirmed && (
        <button
          type="button"
          onClick={confirm}
          className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl text-sm transition-all active:scale-[0.98] shadow-md shadow-teal-700/20 animate-in fade-in slide-in-from-bottom-1 cursor-pointer"
        >
          {CONFIRM_LABELS[lang] || CONFIRM_LABELS.en}
        </button>
      )}
    </div>
  );
}

// ─── Face / Numerical Pain Scale ──────────────────────────────────────────────
function FaceScale({ options, lang, onSelect, disabled }) {
  const [chosen, setChosen] = useState(null);

  const handle = (opt) => {
    if (disabled || chosen) return;
    setChosen(opt.id);
    const { primary } = getLabels(opt, lang);
    setTimeout(() => onSelect(`${opt.id}/10 – ${primary}`), 180);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full">
      {options.map((opt) => {
        const { primary } = getLabels(opt, lang);
        const isSelected = chosen === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => handle(opt)}
            disabled={disabled || chosen !== null}
            className={`flex flex-col items-center justify-center gap-1.5 py-4 px-3 rounded-2xl border transition-all duration-200 active:scale-[0.97] disabled:opacity-50 cursor-pointer shadow-xs ${
              isSelected
                ? 'bg-teal-600 border-teal-600 text-white shadow-md scale-[1.02]'
                : 'bg-white/95 border-slate-200/90 text-slate-800 hover:border-teal-500 hover:bg-teal-50/40 hover:shadow-sm'
            }`}
          >
            <span className={`text-xl font-extrabold ${isSelected ? 'text-white' : 'text-teal-700'}`}>
              {opt.id}/10
            </span>
            <span className={`text-xs font-semibold text-center ${
              isSelected ? 'text-teal-50' : 'text-slate-600'
            }`}>
              {primary}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Yes / No large buttons ───────────────────────────────────────────────────
function YesNoPanel({ options, lang, onSelect, disabled }) {
  const [chosen, setChosen] = useState(null);

  const handle = (opt) => {
    if (disabled || chosen) return;
    setChosen(opt.id);
    const { primary } = getLabels(opt, lang);
    const val = (lang === 'hi' ? (opt.label_hi || primary) : lang === 'mr' ? (opt.label_mr || primary) : (opt.label_en || primary)) || opt.value || primary;
    setTimeout(() => onSelect(val), 180);
  };

  const isYes = (opt) => opt.id.startsWith('yes') || opt.id.includes('spread_yes');

  return (
    <div className="flex gap-3 w-full">
      {options.map((opt) => {
        const { primary, sub } = getLabels(opt, lang);
        const isSelected = chosen === opt.id;
        const yes = isYes(opt);

        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => handle(opt)}
            disabled={disabled || chosen !== null}
            className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-5 px-4 rounded-2xl border-2 font-bold text-sm transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-xs ${
              isSelected
                ? yes
                  ? 'bg-teal-600 border-teal-600 text-white shadow-md'
                  : 'bg-slate-700 border-slate-700 text-white shadow-md'
                : yes
                ? 'bg-white border-teal-200 text-teal-800 hover:bg-teal-50 hover:border-teal-400'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isSelected ? 'bg-white/20 text-white' : yes ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {yes ? <Check className="w-5 h-5 stroke-[2.5]" /> : <X className="w-5 h-5 stroke-[2.5]" />}
            </div>
            <span className="text-sm sm:text-base leading-tight text-center font-bold mt-1">
              {primary}
            </span>
            {sub && (
              <span className={`text-xs font-normal text-center ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                {sub}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export function TouchOptions({ step, lang, onSelect, disabled = false }) {
  if (!step || !step.ui_type) return null;

  const { ui_type, options } = step;

  if (ui_type === 'body_map') return null; // handled separately by BodyMap

  if (!options || options.length === 0) return null;

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
      {ui_type === 'chips' && (
        <ChipGrid options={options} lang={lang} onSelect={onSelect} disabled={disabled} />
      )}
      {ui_type === 'chips_multi' && (
        <MultiChipGrid options={options} lang={lang} onSelect={onSelect} disabled={disabled} />
      )}
      {ui_type === 'face_scale' && (
        <FaceScale options={options} lang={lang} onSelect={onSelect} disabled={disabled} />
      )}
      {ui_type === 'yesno' && (
        <YesNoPanel options={options} lang={lang} onSelect={onSelect} disabled={disabled} />
      )}
    </div>
  );
}
export default TouchOptions;
