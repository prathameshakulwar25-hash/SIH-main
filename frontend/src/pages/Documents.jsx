import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, AlertTriangle, CheckCircle2, Save, ChevronRight, AlertCircle, RefreshCw, Volume2 } from 'lucide-react';

import { useGlobalState } from '../context/GlobalStateContext';

const Documents = () => {
  const navigate = useNavigate();
  const { globalState, updateState } = useGlobalState();
  const [sessionId] = useState(() => {
    let sid = sessionStorage.getItem('session_id') || globalState?.session_id;
    if (!sid) {
      sid = `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      sessionStorage.setItem('session_id', sid);
    }
    return sid;
  });

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  const handleUpload = (selectedFile) => {
    setFile(selectedFile);
    setUploading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('session_id', sessionId);
    
    fetch('http://localhost:8000/api/documents/upload', {
      method: 'POST',
      body: formData
    })
      .then(res => {
        if (!res.ok) throw new Error("Upload failed");
        return res.json();
      })
      .then(data => {
        setResult(data);
        const docs = globalState.documents || [];
        updateState({
          documents: [
            ...docs,
            {
              id: data.id,
              timestamp: data.timestamp || new Date().toISOString(),
              raw_text: data.raw_text,
              ...data.parsed_data
            }
          ]
        });
        setUploading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Failed to process document. Please try again.");
        setUploading(false);
      });
  };

  const renderEditableField = (label, value, confidence, flag = null) => {
    const isLow = confidence === 'low';
    return (
      <div className={`mb-4 p-4 rounded-xl border transition-all ${isLow ? 'bg-amber-50 border-amber-300 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center justify-between mb-2">
           <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
           {isLow && <span className="flex items-center text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-200 uppercase tracking-widest"><AlertTriangle className="w-3 h-3 mr-1" /> Low Confidence</span>}
        </div>
        <div className="flex items-center">
          <input 
            type="text" 
            defaultValue={value}
            className={`w-full bg-transparent font-medium text-slate-800 focus:outline-none focus:border-b-2 ${isLow ? 'focus:border-amber-400' : 'focus:border-indigo-400'}`}
          />
        </div>
        {flag && flag !== 'Normal' && <p className="text-xs text-red-600 font-bold mt-2 flex items-center"><AlertTriangle className="w-3 h-3 mr-1" /> {flag}</p>}
      </div>
    );
  };

  const instructionText = "Securely upload prescriptions, lab reports, or past clinical notes. Our system will extract the structured data.";
  const [fallbackMsg, setFallbackMsg] = useState("");

  const speak = (text) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    let targetLang = globalState.language === 'hi' ? 'hi-IN' : (globalState.language === 'mr' ? 'mr-IN' : 'en-IN');
    setFallbackMsg("");

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      const hasTarget = voices.some(v => v.lang.startsWith(targetLang.slice(0, 2)));
      if (!hasTarget) {
        if (targetLang === 'mr-IN' && voices.some(v => v.lang.startsWith('hi'))) {
          targetLang = 'hi-IN';
          setFallbackMsg("Playing in Hindi voice (Marathi voice not available on this device)");
        } else if (targetLang !== 'en-IN' && targetLang !== 'en-US') {
          targetLang = 'en-US';
          setFallbackMsg("Playing in default voice (Regional voice not available on this device)");
        }
      }
    }

    u.lang = targetLang;
    u.onend = () => setFallbackMsg("");
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="flex flex-col items-center flex-1 bg-slate-50 font-sans p-6 text-slate-800">
      <div className="w-full max-w-2xl pt-8">
        
        {!result && !error && (
          <>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Upload Medical Records</h1>
            
            <div className="flex flex-col bg-white p-4 rounded-xl mb-8 border border-slate-200 text-left shadow-sm">
               <div className="flex items-start">
                 <button 
                   onClick={() => speak(instructionText)} 
                   className="mr-3 p-3 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                   aria-label="Read instructions aloud"
                 >
                   <Volume2 className="w-6 h-6" />
                 </button>
                 <p className="text-slate-700 text-lg leading-snug font-medium">
                   {instructionText}
                 </p>
               </div>
               {fallbackMsg && (
                 <div className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded-lg">
                   {fallbackMsg}
                 </div>
               )}
            </div>
            
            <div 
              className={`border-3 border-dashed rounded-3xl p-12 text-center transition-all duration-200 
                ${dragActive ? 'border-indigo-500 bg-indigo-50 scale-[1.02]' : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-slate-50'}
                ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !uploading && document.getElementById('file-upload').click()}
            >
              <input 
                id="file-upload" 
                type="file" 
                className="hidden" 
                accept="image/*,.pdf" 
                onChange={handleChange}
                disabled={uploading}
              />
              
              {uploading ? (
                <div className="py-2">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <UploadCloud className="w-7 h-7 text-indigo-600 animate-pulse" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-indigo-900 mb-2">Analyzing Medical Document...</h3>
                  <p className="text-sm text-indigo-600 font-medium max-w-sm mx-auto">
                    Running Tesseract OCR & extracting clinical entities (medications, labs, dates)...
                  </p>
                  <div className="w-56 h-2 mx-auto mt-4 rounded-full skeleton-shimmer overflow-hidden border border-indigo-100 shadow-xs"></div>
                </div>
              ) : (
                <div>
                  <UploadCloud className={`w-16 h-16 mx-auto mb-4 ${dragActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Drag & Drop file here</h3>
                  <p className="text-sm text-slate-500">or click to browse from your device</p>
                  <p className="text-xs text-slate-400 mt-4">Supports JPEG, PNG, PDF (Max 10MB)</p>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end">
              <button 
                onClick={() => navigate(`/summary/${sessionId}`)}
                className="px-6 py-3 text-indigo-600 font-bold hover:bg-indigo-50 rounded-xl transition"
              >
                Skip Upload
              </button>
            </div>
          </>
        )}

        {error && (
          <div className="bg-red-50 p-6 rounded-2xl border border-red-200 text-center max-w-md mx-auto mt-12">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-red-800 mb-2">Upload Failed</h2>
            <p className="text-red-600 mb-6">{error}</p>
            <button 
              onClick={() => {
                setError(null);
                setFile(null);
              }} 
              className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700 transition flex mx-auto items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Try Another File
            </button>
          </div>
        )}

        {result && (
          <div className="animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
              <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center"><CheckCircle2 className="w-6 h-6 text-emerald-500 mr-2" /> Data Extracted</h2>
                  <p className="text-slate-500 text-sm mt-1">Please verify the fields below before saving.</p>
                </div>
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full uppercase tracking-widest border border-indigo-100">
                  {file?.name}
                </span>
              </div>

              {result.parsed_data.medications?.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Medications</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {result.parsed_data.medications.map((m, i) => (
                      <div key={i}>
                        {renderEditableField(`Med ${i+1} Name`, m.name, m.confidence)}
                        {renderEditableField(`Med ${i+1} Dose`, m.dosage, m.confidence)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.parsed_data.labs?.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Lab Results</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {result.parsed_data.labs.map((l, i) => (
                      <div key={i}>
                        {renderEditableField(l.test, l.value, l.confidence, l.flag)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.parsed_data.diagnoses?.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Past Diagnoses & Clinical Conditions</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.parsed_data.diagnoses.map((d, i) => (
                      <span key={i} className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold">
                        {d.condition || d}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.parsed_data.doctor_notes?.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Physician Notes & Clinical Advice</h3>
                  <div className="space-y-2">
                    {result.parsed_data.doctor_notes.map((note, i) => (
                      <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium">
                        {note}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!result.parsed_data.medications?.length && !result.parsed_data.labs?.length && !result.parsed_data.diagnoses?.length) && (
                <div className="bg-slate-50 p-6 rounded-xl text-center text-slate-500 border border-slate-200 mb-8">
                  No structured medications, diagnoses or labs could be confidently extracted from this document.
                </div>
              )}

              <div className="flex flex-wrap gap-3 justify-end mt-8 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => {
                    setResult(null);
                    setFile(null);
                  }}
                  className="px-5 py-2.5 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition text-sm"
                >
                  Upload Another Record
                </button>
                <button 
                  onClick={() => navigate('/voice-intake')}
                  className="px-6 py-2.5 font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition shadow-md flex items-center active:scale-95 text-sm"
                >
                  Proceed to Voice Consultation with this Record →
                </button>
                <button 
                  onClick={() => navigate(`/summary/${sessionId}`)}
                  className="px-6 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-md flex items-center active:scale-95 text-sm"
                >
                  <Save className="w-4 h-4 mr-1.5" /> View Summary
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Documents;
