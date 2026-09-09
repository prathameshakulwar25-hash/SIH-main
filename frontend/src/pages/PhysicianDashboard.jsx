import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGlobalState } from '../context/GlobalStateContext';
import {
  Stethoscope, AlertTriangle, CheckCircle2, Clock, User, FileText,
  RefreshCw, ChevronDown, ChevronUp, Edit3, Save, Shield, ShieldCheck, LogOut,
  Pill, MessageSquare, Activity, HeartPulse, XCircle, Loader2, Printer,
  Eye, RotateCcw, Sparkles, Download, QrCode, ExternalLink
} from 'lucide-react';
import AbhaCard from '../components/AbhaCard';
import { JeevanLogoIcon } from '../components/JeevanLogo';

const API_BASE = 'http://localhost:8000';

const URGENCY_CFG = {
  emergency: { badge: 'bg-red-100 border-red-300 text-red-700', row: 'border-l-4 border-red-500', label: '🚨 Emergency', dot: 'bg-red-500' },
  urgent:    { badge: 'bg-orange-100 border-orange-300 text-orange-700', row: 'border-l-4 border-orange-400', label: '⚠️ Urgent', dot: 'bg-orange-400' },
  routine:   { badge: 'bg-emerald-100 border-emerald-300 text-emerald-700', row: 'border-l-4 border-slate-200', label: '✅ Routine', dot: 'bg-emerald-500' },
};

const UrgencyBadge = ({ urgency }) => {
  const cfg = URGENCY_CFG[urgency] || URGENCY_CFG.routine;
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${cfg.badge}`}>{cfg.label}</span>;
};

const formatTime = (ts) => {
  if (!ts) return '';
  try { return new Date(ts).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }); }
  catch { return ts; }
};

// Formatted Markdown Renderer for Physician Reports
const ReportMarkdownRenderer = ({ text }) => {
  if (!text) return null;
  const clean = text.replace('[INTAKE_COMPLETE]', '').replace(/```json[\s\S]*?```/g, '').trim();

  return (
    <div className="space-y-2 text-slate-700 font-sans">
      {clean.split('\n').map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-2" />;

        // Main section headings (## ...)
        if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
          const title = trimmed.replace(/^#+\s*/, '');
          const isAyush = title.includes('Dashavidha') || title.includes('AYUSH') || title.includes('दशविध');
          return (
            <div key={i} className={`pt-3 pb-1 border-b ${isAyush ? 'border-amber-200 bg-amber-50/70 -mx-3 px-3 py-2 rounded-xl mt-4 mb-2' : 'border-slate-200 mt-4 first:mt-0'}`}>
              <h4 className={`font-black text-sm uppercase tracking-wide flex items-center gap-2 ${isAyush ? 'text-amber-900' : 'text-slate-900'}`}>
                {isAyush && <span className="text-amber-600 text-base">🌿</span>}
                {title}
              </h4>
            </div>
          );
        }

        // Subheadings (### ...)
        if (trimmed.startsWith('### ')) {
          return (
            <h5 key={i} className="font-bold text-xs uppercase tracking-wider text-indigo-900 mt-3 mb-1">
              {trimmed.replace(/^###\s*/, '')}
            </h5>
          );
        }

        // Bullet points or numbered items
        const isBullet = trimmed.startsWith('* ') || trimmed.startsWith('- ') || /^\d+\.\s/.test(trimmed);
        const cleanLine = trimmed.replace(/^(\*|-|\d+\.)\s*/, '');

        // Highlight bold parts
        const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
        return (
          <div key={i} className={`flex items-start gap-2 text-xs sm:text-sm leading-relaxed ${isBullet ? 'pl-2' : ''}`}>
            {isBullet && <span className="text-indigo-500 mt-1 select-none text-xs shrink-0 font-bold">•</span>}
            <p className="flex-1">
              {parts.map((p, idx) => {
                if (p.startsWith('**') && p.endsWith('**')) {
                  return <strong key={idx} className="font-bold text-slate-900">{p.slice(2, -2)}</strong>;
                }
                if (p.startsWith('*') && p.endsWith('*')) {
                  return <em key={idx} className="italic text-slate-800">{p.slice(1, -1)}</em>;
                }
                return p;
              })}
            </p>
          </div>
        );
      })}
    </div>
  );
};

const formatClinicalTitle = (text) => {
  if (!text) return 'Acute Clinical Consultation';
  const lower = String(text).toLowerCase();
  if (
    lower.includes('headache') || lower.includes('cephalea') || lower.includes('migraine') ||
    lower.includes('सिरदर्द') || lower.includes('डोकेदुखी') || lower.includes('sar dard') || lower.includes('sir dard') ||
    ((lower.includes('sar') || lower.includes('sir') || lower.includes('matha')) && (lower.includes('dard') || lower.includes('pain') || lower.includes('ghum')))
  ) {
    return 'Headache / Cephalea';
  }
  if (lower.includes('pet') || lower.includes('stomach') || lower.includes('abdomen') || lower.includes('पेट') || lower.includes('पोट')) {
    return 'Acute Abdominal Discomfort';
  }
  if (lower.includes('chest') || lower.includes('chhati') || lower.includes('seene') || lower.includes('heart')) {
    return 'Precordial Chest Pain';
  }
  if (lower.includes('fever') || lower.includes('bukhar') || lower.includes('ताप') || lower.includes('बुखार')) {
    return 'Pyrexia / Febrile Illness';
  }
  if (lower.includes('chakkar') || lower.includes('dizzy') || lower.includes('vertigo')) {
    return 'Acute Vertigo / Presyncope';
  }
  if (lower.includes('cough') || lower.includes('khansi') || lower.includes('breath') || lower.includes('saans')) {
    return 'Respiratory Symptoms / Dyspnea';
  }
  const casualWords = ['bhai', 'yaar', 'kr rha', 'kar raha', 'ho rha', 'hai'];
  if (casualWords.some(w => lower.includes(w))) {
    return 'Acute Clinical Consultation';
  }
  return text.replace(/-/g, ' ');
};

const PhysicianDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionFromUrl = searchParams.get('session') || searchParams.get('session_id');
  const { globalState, updateState } = useGlobalState();

  useEffect(() => {
    if (!globalState?.role || globalState.role !== 'physician') navigate('/');
  }, [globalState?.role, navigate]);

  const [reports, setReports] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showConversation, setShowConversation] = useState(false);
  const [filterUrgency, setFilterUrgency] = useState('all');
  const [error, setError] = useState('');

  // Physician Report Editing State
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [editedReportText, setEditedReportText] = useState('');
  const [originalReportText, setOriginalReportText] = useState('');
  const [savingReport, setSavingReport] = useState(false);
  const [reportSuccessMsg, setReportSuccessMsg] = useState('');
  const [editorTab, setEditorTab] = useState('edit'); // 'edit' | 'preview'

  const fetchReports = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch(`${API_BASE}/api/physician/reports`);
      const data = await res.json();
      setReports(data.reports || []);
    } catch { setError('Could not load reports. Is the backend running?'); }
    finally { setLoadingList(false); }
  }, []);

  const fetchDetail = useCallback(async (sessionId) => {
    setLoadingDetail(true);
    setDetail(null); 
    setNotes(''); 
    setShowConversation(false);
    setIsEditingReport(false);
    setReportSuccessMsg('');
    try {
      const res = await fetch(`${API_BASE}/api/physician/reports/${sessionId}`);
      const data = await res.json();
      setDetail(data);
      setNotes(data.physician_notes || '');
      const reportText = data.summary?.clinician_summary || data.summary?.summary_text || '';
      setEditedReportText(reportText);
      setOriginalReportText(reportText);
    } catch { setError('Could not load report detail.'); }
    finally { setLoadingDetail(false); }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);
  
  // Sync selectedId with sessionFromUrl if passed in query string
  useEffect(() => {
    if (sessionFromUrl) {
      setSelectedId(sessionFromUrl);
    }
  }, [sessionFromUrl]);

  useEffect(() => { if (selectedId) fetchDetail(selectedId); }, [selectedId, fetchDetail]);

  const insertIntoReport = (snippet) => {
    setEditedReportText(prev => {
      const base = (prev || '').trim();
      return base ? `${base}\n${snippet}` : snippet;
    });
    if (!isEditingReport) setIsEditingReport(true);
  };

  const handleVerify = async () => {
    if (!selectedId) return;
    setVerifying(true);
    try {
      await fetch(`${API_BASE}/api/physician/reports/${selectedId}/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ physician_id: 'physician-1', notes }),
      });
      await fetchDetail(selectedId);
      await fetchReports();
    } catch { setError('Failed to verify report.'); }
    finally { setVerifying(false); }
  };

  const handleSaveNotes = async () => {
    if (!selectedId) return;
    setSavingNotes(true);
    try {
      await fetch(`${API_BASE}/api/physician/reports/${selectedId}/notes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ physician_id: 'physician-1', notes }),
      });
    } catch { setError('Failed to save notes.'); }
    finally { setSavingNotes(false); }
  };

  const handleStartEditReport = () => {
    const current = detail?.summary?.clinician_summary || detail?.summary?.summary_text || '';
    setEditedReportText(current);
    setIsEditingReport(true);
    setEditorTab('edit');
    setReportSuccessMsg('');
  };

  const handleCancelEditReport = () => {
    setEditedReportText(originalReportText);
    setIsEditingReport(false);
  };

  const handleSaveReport = async () => {
    if (!selectedId) return;
    setSavingReport(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/physician/reports/${selectedId}/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          physician_id: 'physician-1',
          clinician_summary: editedReportText
        })
      });
      const result = await res.json();
      if (res.ok) {
        setDetail(prev => ({
          ...prev,
          summary: {
            ...prev.summary,
            clinician_summary: editedReportText,
            physician_edited: true,
            last_edited_by: 'physician-1',
            last_edited_at: result.last_edited_at || new Date().toISOString()
          }
        }));
        setOriginalReportText(editedReportText);
        setIsEditingReport(false);
        setReportSuccessMsg('Report corrections successfully saved to medical record.');
        setTimeout(() => setReportSuccessMsg(''), 5000);
      } else {
        setError(result.detail || 'Failed to update report.');
      }
    } catch {
      setError('Network error while saving report.');
    } finally {
      setSavingReport(false);
    }
  };

  const [showAbhaModal, setShowAbhaModal] = useState(false);
  const [downloadingFhir, setDownloadingFhir] = useState(false);

  const handleDownloadFhir = async () => {
    if (!selectedId) return;
    setDownloadingFhir(true);
    try {
      const res = await fetch(`${API_BASE}/api/abdm/fhir/${selectedId}`);
      const bundle = await res.json();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bundle, null, 2));
      const dlAnchorElem = document.createElement('a');
      dlAnchorElem.setAttribute("href", dataStr);
      dlAnchorElem.setAttribute("download", `NRCES_FHIR_R4_Bundle_${selectedId.slice(0, 8)}.json`);
      dlAnchorElem.click();
    } catch {
      setError('Failed to export FHIR R4 Bundle.');
    } finally {
      setDownloadingFhir(false);
    }
  };

  const filteredReports = filterUrgency === 'all' ? reports : reports.filter(r => r.urgency === filterUrgency);
  const summary = detail?.summary || {};
  const clinicianSummaryText = summary.clinician_summary || summary.summary_text || '';
  const conversationHistory = summary.conversation_history || [];
  const isPhysicianEdited = summary.physician_edited;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 shadow-sm flex items-center justify-between z-20 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="shrink-0 flex items-center justify-center">
            <JeevanLogoIcon className="w-9 h-9" idPrefix="physician-hdr" />
          </div>
          <div>
            <h1 className="text-slate-900 font-black text-sm leading-tight">Physician Dashboard</h1>
            <p className="text-teal-600 text-xs font-semibold">Jeevan · Clinical Report Queue</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchReports}
            className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loadingList ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => { updateState({ role: null }); navigate('/'); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 text-xs font-bold transition">
            <LogOut className="w-3.5 h-3.5" />Logout
          </button>
        </div>
      </header>

      {error && (
        <div className="px-4 py-2.5 bg-red-50 border-b border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
          <XCircle className="w-3.5 h-3.5" />{error}
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {reportSuccessMsg && (
        <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{reportSuccessMsg}</span>
          <button onClick={() => setReportSuccessMsg('')} className="ml-auto text-emerald-500 hover:text-emerald-700">✕</button>
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Queue */}
        <aside className="w-full sm:w-80 lg:w-96 border-r border-slate-200 bg-white flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <h2 className="text-slate-800 font-bold text-sm">
              Patient Queue <span className="text-xs font-normal text-slate-400">({filteredReports.length})</span>
            </h2>
            <select value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)}
              className="bg-white border border-slate-200 text-xs text-slate-600 rounded-lg px-2 py-1 outline-none shadow-sm">
              <option value="all">All</option>
              <option value="emergency">Emergency</option>
              <option value="urgent">Urgent</option>
              <option value="routine">Routine</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loadingList ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-sm">
                <FileText className="w-8 h-8 mb-2 opacity-30" />
                <p className="font-semibold">No reports in queue</p>
                <p className="text-xs mt-1">Reports appear after patients complete intake</p>
              </div>
            ) : (
              filteredReports.map((r) => {
                const cfg = URGENCY_CFG[r.urgency] || URGENCY_CFG.routine;
                const isSelected = selectedId === r.session_id;
                return (
                  <button key={r.session_id} onClick={() => setSelectedId(r.session_id)}
                    className={`w-full text-left px-4 py-4 border-b border-slate-100 transition-all ${cfg.row} ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${cfg.dot}`} />
                        <div className="min-w-0">
                          <p className="text-slate-900 text-xs font-bold truncate">
                            {r.patient_name || r.abha_id || r.session_id.slice(0, 14) + '...'}
                          </p>
                          <p className="text-slate-400 text-[11px] truncate mt-0.5">
                            {r.gender ? `${r.gender === 'M' ? 'Male' : 'Female'}${r.age ? `, ${r.age}y` : ''} · ` : ''}{r.abha_id ? `${r.abha_id} · ` : ''}{formatClinicalTitle(r.intake_type)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <UrgencyBadge urgency={r.urgency} />
                        {r.verified && (
                          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" />Verified
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-slate-400 text-[10px] mt-1.5 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />{formatTime(r.timestamp)}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right: Detail */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
          {!selectedId ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Stethoscope className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-semibold text-slate-500">Select a patient from the queue</p>
              <p className="text-xs mt-1">The full clinical report will appear here</p>
            </div>
          ) : loadingDetail ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
            </div>
          ) : detail ? (
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Report header card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <User className="w-4 h-4 text-teal-600" />
                      <h2 className="text-slate-900 font-black text-lg">
                        {detail.patient_name || detail.patient_details?.name || detail.abha_id || 'Patient'}
                      </h2>
                      <UrgencyBadge urgency={detail.urgency} />
                      {detail.verified && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />Verified
                        </span>
                      )}
                      {isPhysicianEdited && (
                        <span className="inline-flex items-center gap-1 text-purple-700 text-xs font-bold bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                          <Edit3 className="w-3 h-3" />Doctor Edited
                        </span>
                      )}
                    </div>
                    
                    {/* Patient Demographic Tags */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1.5 flex-wrap">
                      <span className="font-mono text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                        {detail.abha_id || 'ABHA Unlinked'}
                      </span>
                      {detail.patient_details?.gender && <span>• {detail.patient_details.gender === 'M' ? 'Male' : 'Female'}</span>}
                      {detail.patient_details?.age && <span>• {detail.patient_details.age} Yrs</span>}
                      {detail.patient_details?.phone && <span>• 📞 +91 {detail.patient_details.phone.replace(/\D/g, '').slice(-10)}</span>}
                      {detail.patient_details?.email && <span>• ✉️ {detail.patient_details.email}</span>}
                    </div>

                    <p className="text-slate-500 text-xs flex items-center gap-2">
                      <Clock className="w-3 h-3" />{formatTime(detail.timestamp)}
                      <span className="text-slate-300">·</span>
                      <Activity className="w-3 h-3" />{formatClinicalTitle(detail.intake_type)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setShowAbhaModal(true)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 rounded-xl text-xs font-bold transition shadow-xs"
                      title="View Government of India ABHA Health Card">
                      <QrCode className="w-3.5 h-3.5 text-amber-600" />ABHA Card
                    </button>
                    <button onClick={handleDownloadFhir} disabled={downloadingFhir}
                      className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
                      title="Export NRCES / NDHM HL7 FHIR R4 Bundle">
                      {downloadingFhir ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      FHIR R4 (ABDM)
                    </button>
                    <button onClick={() => window.print()}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-800 rounded-xl text-xs font-bold transition shadow-sm">
                      <Printer className="w-3.5 h-3.5" />Print
                    </button>
                    {!detail.verified && (
                      <button onClick={handleVerify} disabled={verifying}
                        className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-60 shadow-sm shadow-teal-200">
                        {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}
                        Verify Report
                      </button>
                    )}
                  </div>
                </div>

                {/* Red flags */}
                {detail.red_flags?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {detail.red_flags.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                        <AlertTriangle className="w-3 h-3" />{f}
                      </span>
                    ))}
                  </div>
                )}
                {detail.flags?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {detail.flags.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold px-2.5 py-1 rounded-full">{f}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Clinical & AYUSH Encounter Report with Doctor Editing */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between pb-3 mb-4 border-b border-slate-100 gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-slate-900 font-bold text-base">Clinical & AYUSH Encounter Report</h3>
                    {isPhysicianEdited && (
                      <span className="text-[11px] bg-purple-100 border border-purple-200 text-purple-800 px-2 py-0.5 rounded-md font-bold">
                        Amended by Doctor
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isEditingReport ? (
                      <>
                        <div className="flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                          <button
                            type="button"
                            onClick={() => setEditorTab('edit')}
                            className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${editorTab === 'edit' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            <Edit3 className="w-3 h-3 inline mr-1" />Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditorTab('preview')}
                            className={`px-2.5 py-1 text-xs font-bold rounded-md transition ${editorTab === 'preview' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            <Eye className="w-3 h-3 inline mr-1" />Live Preview
                          </button>
                        </div>
                        <button
                          onClick={handleCancelEditReport}
                          disabled={savingReport}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveReport}
                          disabled={savingReport}
                          className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm shadow-emerald-200 disabled:opacity-50"
                        >
                          {savingReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          Save Changes
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-full font-bold">
                          English Standard
                        </span>
                        <button
                          onClick={handleStartEditReport}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold transition shadow-xs"
                          title="Edit clinical report if AI made any mistakes or omission"
                        >
                          <Edit3 className="w-3.5 h-3.5" />Edit Report
                        </button>
                        <button
                          onClick={() => window.open(`/summary/${selectedId}`, '_blank')}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-xl text-xs font-bold transition shadow-xs"
                          title="Open patient-facing clinical encounter report in a new tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />View Patient Report
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isEditingReport ? (
                  <div className="space-y-3">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Doctor Correction Mode Active</p>
                        <p className="text-amber-800 mt-0.5">
                          You can modify, fix, or expand any clinical section below (Chief Complaints, History of Present Illness, Dashavidha Pariksha, ICD-10 Differential Diagnosis, or Treatment). Changes will be saved as the official clinical record.
                        </p>
                      </div>
                    </div>

                    {editorTab === 'edit' ? (
                      <div className="space-y-2">
                        <textarea
                          value={editedReportText}
                          onChange={e => setEditedReportText(e.target.value)}
                          rows={20}
                          className="w-full font-mono text-xs sm:text-sm bg-slate-900 text-emerald-300 p-4 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent leading-relaxed"
                          placeholder="Type or edit clinical report markdown here..."
                        />
                        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                          <span>{editedReportText.split('\n').length} lines · {editedReportText.length} characters</span>
                          <button
                            type="button"
                            onClick={() => setEditedReportText(originalReportText)}
                            className="text-slate-500 hover:text-slate-700 flex items-center gap-1 text-[11px]"
                          >
                            <RotateCcw className="w-3 h-3" />Reset to initial draft
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 min-h-[300px]">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Live Formatted Preview</p>
                        <ReportMarkdownRenderer text={editedReportText} />
                      </div>
                    )}
                  </div>
                ) : clinicianSummaryText ? (
                  <ReportMarkdownRenderer text={clinicianSummaryText} />
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No clinical summary text generated yet.
                  </div>
                )}
              </div>

              {/* AYUSH profile */}
              {detail.ayush_profile && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
                  <h3 className="flex items-center gap-2 text-amber-800 font-bold text-sm mb-3">
                    <HeartPulse className="w-4 h-4" />AYUSH Profile
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {['prakriti', 'agni', 'koshtha'].map(k => (
                      <div key={k} className="text-center bg-white border border-amber-200 rounded-xl p-2.5">
                        <p className="text-amber-600 text-xs font-bold uppercase tracking-wider">{k}</p>
                        <p className="text-slate-800 text-sm font-semibold mt-0.5">{detail.ayush_profile[k] || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Uploaded Documents & Prescriptions */}
              {detail.documents?.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-teal-600" />
                      <h3 className="text-slate-900 font-bold text-sm">
                        Uploaded Past Prescriptions & Diagnostic Reports ({detail.documents.length})
                      </h3>
                    </div>
                    <span className="text-[11px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
                      AI OCR Extracted
                    </span>
                  </div>

                  {detail.documents.map((doc, i) => {
                    const hasMeds = doc.medications && doc.medications.length > 0;
                    const hasLabs = doc.labs && doc.labs.length > 0;
                    const hasDiag = doc.diagnoses && doc.diagnoses.length > 0;
                    const hasNotes = doc.doctor_notes && doc.doctor_notes.length > 0;

                    return (
                      <div key={i} className="border border-slate-100 bg-slate-50/60 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-semibold border-b border-slate-200/60 pb-2">
                          <span className="flex items-center gap-1.5 text-slate-700 font-bold">
                            <Pill className="w-3.5 h-3.5 text-indigo-500" /> Document Record #{i + 1}
                          </span>
                          <span>{doc.timestamp ? formatTime(doc.timestamp) : 'Prior Encounter Record'}</span>
                        </div>

                        {/* Past Diagnoses */}
                        {hasDiag && (
                          <div>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Prior Diagnoses</p>
                            <div className="flex flex-wrap gap-1.5">
                              {doc.diagnoses.map((d, idx) => (
                                <span key={idx} className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-md text-xs font-semibold">
                                  {typeof d === 'string' ? d : d.condition}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Medications */}
                        {hasMeds && (
                          <div>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Prescribed Medications</p>
                            <div className="grid sm:grid-cols-2 gap-2">
                              {doc.medications.map((m, idx) => {
                                const name = typeof m === 'string' ? m : m.name;
                                const dose = typeof m === 'object' ? m.dosage : null;
                                return (
                                  <div key={idx} className="bg-white border border-slate-200 rounded-lg p-2 text-xs flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="font-bold text-slate-800 truncate">{name}</span>
                                      {dose && <span className="text-slate-500 text-[11px] bg-slate-100 px-1.5 py-0.5 rounded shrink-0">{dose}</span>}
                                    </div>
                                    <button
                                      onClick={() => insertIntoReport(`- **${name}**: ${dose || 'Dosage as directed'}`)}
                                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 transition shrink-0"
                                      title="Insert medication into clinical report"
                                    >
                                      + Add to Report
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Labs */}
                        {hasLabs && (
                          <div>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Diagnostic Labs</p>
                            <div className="grid sm:grid-cols-2 gap-2">
                              {doc.labs.map((l, idx) => {
                                const test = typeof l === 'string' ? l : l.test;
                                const val = typeof l === 'object' ? l.value : '';
                                const flag = typeof l === 'object' ? l.flag : null;
                                return (
                                  <div key={idx} className="bg-white border border-slate-200 rounded-lg p-2 text-xs flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="font-semibold text-slate-700 truncate">{test}</span>
                                      <span className="font-bold text-slate-900 shrink-0">{val}</span>
                                      {flag && <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded shrink-0">{flag}</span>}
                                    </div>
                                    <button
                                      onClick={() => insertIntoReport(`- **${test}**: ${val}${flag ? ` (${flag})` : ''}`)}
                                      className="text-[10px] font-bold text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded border border-teal-200 transition shrink-0"
                                      title="Insert lab result into clinical report"
                                    >
                                      + Add to Report
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Doctor Notes */}
                        {hasNotes && (
                          <div>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Previous Physician Notes</p>
                            <div className="space-y-1">
                              {doc.doctor_notes.map((n, idx) => (
                                <p key={idx} className="text-xs text-slate-600 bg-white border border-slate-200 rounded-lg p-2">
                                  {n}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Conversation transcript */}
              {conversationHistory.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <button onClick={() => setShowConversation(v => !v)}
                    className="w-full flex items-center justify-between px-5 py-4 text-sm font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition">
                    <span className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-slate-400" />
                      Patient Conversation Transcript
                      <span className="text-xs font-normal text-slate-400">({conversationHistory.length} messages)</span>
                    </span>
                    {showConversation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showConversation && (
                    <div className="px-5 pb-4 space-y-3 max-h-72 overflow-y-auto border-t border-slate-100">
                      {conversationHistory.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'}`}>
                            {msg.content?.replace('[INTAKE_COMPLETE]', '').replace(/```json[\s\S]*?```/g, '').trim()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Physician notes */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-3">
                  <Edit3 className="w-4 h-4 text-purple-500" />Physician Notes
                  {detail.verified && <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Report Verified</span>}
                </h3>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Add clinical notes, differential diagnosis, or follow-up instructions..."
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition resize-none" />
                <div className="flex gap-2 mt-3">
                  <button onClick={handleSaveNotes} disabled={savingNotes}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-60 shadow-sm">
                    {savingNotes ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}Save Notes
                  </button>
                  {!detail.verified && (
                    <button onClick={handleVerify} disabled={verifying}
                      className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-60 shadow-sm shadow-teal-200">
                      {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Shield className="w-3.5 h-3.5" />}Verify & Sign
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </main>
      </div>

      {/* ABHA Digital Health Card Modal */}
      {showAbhaModal && detail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
                <h3 className="font-black text-slate-900 text-sm">Official ABDM Digital Health Card</h3>
              </div>
              <button 
                onClick={() => setShowAbhaModal(false)} 
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 font-bold flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>
            <AbhaCard profile={{
              abha_number: detail.abha_id || '91-4582-7491-0382',
              abha_address: detail.patient?.abha_address || `${(detail.abha_id || 'patient').toLowerCase().replace(/\s+/g, '')}@abdm`,
              name: detail.patient?.name || detail.abha_id || 'Patient Citizen',
              gender: detail.patient?.gender || 'M',
              dob: detail.patient?.dob || '1990',
              mobile: detail.patient?.phone || '9876543210',
              state: 'India',
              photo: detail.patient?.profile_data?.photo
            }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default PhysicianDashboard;

