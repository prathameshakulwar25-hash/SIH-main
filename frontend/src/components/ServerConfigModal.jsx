import React, { useState } from 'react';
import { Server, CheckCircle2, AlertCircle, Loader2, X, Globe, ExternalLink, RefreshCw } from 'lucide-react';
import { getApiBase, setCustomApiBase } from '../config/api';

export const ServerConfigModal = ({ isOpen, onClose, onServerSaved }) => {
  const [url, setUrl] = useState(() => getApiBase());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const cleanUrl = url.trim().replace(/\/$/, '');
    try {
      const res = await fetch(`${cleanUrl}/api/llm/status`, {
        headers: {
          'bypass-tunnel-reminder': 'true',
          'Bypass-Tunnel-Reminder': 'true'
        }
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        if (text.includes('localtunnel') || text.includes('Friendly Reminder')) {
          setTestResult({
            success: false,
            message: 'Localtunnel confirmation page detected. Please open the tunnel URL directly in your browser once and click "Click to Continue" to unlock it.',
            isTunnelReminder: true,
            tunnelUrl: cleanUrl
          });
          return;
        }
        throw new Error('Server responded with HTML instead of JSON. Check the URL.');
      }

      if (res.ok && data.status === 'ready') {
        setTestResult({
          success: true,
          message: `Connected! AI Engine: ${data.provider || 'Groq'} (${data.model || 'gpt-oss-120b'}) is Ready.`
        });
      } else {
        setTestResult({
          success: false,
          message: `Server responded with status ${res.status}: ${data.detail || 'Service not ready'}`
        });
      }
    } catch (err) {
      const isRender = cleanUrl.includes('onrender.com');
      const isLocalhost = cleanUrl.includes('localhost') || cleanUrl.includes('127.0.0.1');
      const isRemoteBrowser = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

      let helpfulMsg = `Failed to connect: ${err.message}.`;
      if (err.message === 'Failed to fetch') {
        if (isRender) {
          helpfulMsg = 'Connecting to Render cloud backend failed. Free-tier cloud servers sleep when idle and take 30–50s to wake up. Please wait 15–20 seconds and click "Test" again.';
        } else if (isLocalhost && isRemoteBrowser) {
          helpfulMsg = 'Cannot connect to localhost:8000 from a remote device. Click the "Use Render Cloud" button below to connect to the deployed backend.';
        } else {
          helpfulMsg = `Failed to connect: ${err.message}. Ensure your backend is running and CORS is allowed.`;
        }
      }

      setTestResult({
        success: false,
        message: helpfulMsg
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const cleanUrl = url.trim().replace(/\/$/, '');
    setCustomApiBase(cleanUrl);
    if (onServerSaved) onServerSaved(cleanUrl);
    onClose();
  };

  const handleResetToDefault = () => {
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const defaultEnv = import.meta.env.VITE_API_BASE_URL || (isLocal ? 'http://localhost:8000' : 'https://sih-main-b6mx.onrender.com');
    setUrl(defaultEnv);
    setCustomApiBase('');
    setTestResult(null);
  };

  const handleUsePreset = (presetUrl) => {
    setUrl(presetUrl);
    setTestResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 text-left">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center border border-white/20">
              <Server className="w-4 h-4 text-teal-300" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight">Backend API Connection</h3>
              <p className="text-[11px] text-teal-100">Live AI & Clinical Server Endpoint</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-3.5 text-slate-800 text-xs">
          <div>
            <label className="block font-bold text-slate-700 text-xs mb-1">
              Backend Server URL
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="url"
                value={url}
                onChange={e => {
                  setUrl(e.target.value);
                  setTestResult(null);
                }}
                placeholder="https://your-tunnel.loca.lt or https://your-backend.onrender.com"
                className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono outline-none focus:border-teal-600 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || !url.trim()}
                className="px-3 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs transition shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1 shadow-xs"
              >
                {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Test</span>
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[10px] text-slate-400 font-medium">Presets:</span>
              <button
                type="button"
                onClick={() => handleUsePreset('https://sih-main-b6mx.onrender.com')}
                className="px-2 py-0.5 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-[10px] font-semibold transition cursor-pointer"
              >
                Render Cloud (Production)
              </button>
              <button
                type="button"
                onClick={() => handleUsePreset('http://localhost:8000')}
                className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[10px] font-medium transition cursor-pointer"
              >
                Localhost:8000
              </button>
            </div>
          </div>

          {/* Test feedback */}
          {testResult && (
            <div className={`p-3 rounded-xl border text-xs ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <div className="flex items-start gap-2">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 leading-relaxed">
                  <p>{testResult.message}</p>
                  {testResult.isTunnelReminder && (
                    <a
                      href={testResult.tunnelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-1 bg-amber-600 text-white rounded-lg font-bold text-[11px] hover:bg-amber-700 transition"
                    >
                      <span>Unlock Tunnel in New Tab</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
            <span>Current Cloud Endpoint: <code>https://sih-main-b6mx.onrender.com</code></span>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="text-teal-700 hover:underline font-semibold cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition cursor-pointer"
          >
            Save & Connect
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServerConfigModal;
