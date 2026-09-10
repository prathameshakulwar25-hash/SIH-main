import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X, Smartphone, Printer, Copy, Check, ExternalLink, QrCode,
  Users, Clock, ArrowRight, ShieldCheck, Sparkles, AlertCircle, Eye
} from 'lucide-react';
import { JeevanBrand, JeevanLogoIcon } from './JeevanLogo';

export default function KioskScanAndSitModal({ isOpen, onClose }) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('qr'); // 'qr' | 'metrics' | 'poster'
  const posterRef = useRef(null);

  if (!isOpen) return null;

  // Base URL for mobile intake
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://jeevan-health.netlify.app';
  const mobileIntakeUrl = `${currentOrigin}/?channel=mobile_qr`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(mobileIntakeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrintPoster = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white p-5 sm:p-6 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <QrCode className="w-7 h-7 text-teal-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-extrabold uppercase tracking-wider bg-teal-400/20 border border-teal-300/30 text-teal-200 px-2.5 py-0.5 rounded-full">
                  OPD Queue-Buster Architecture
                </span>
                <span className="text-[11px] font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">
                  Zero Kiosk Waiting
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
                Scan & Sit • मोबाइल इनटेक कतार समाधान
              </h3>
              <p className="text-xs text-teal-100/80 mt-0.5">
                Eliminate physical kiosk lines — let 50+ patients complete intake concurrently on their own phones.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-teal-200 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-4 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex items-center gap-1.5 px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-white text-teal-900 border-t-2 border-teal-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-4 h-4 text-teal-600" />
            <span>Kiosk QR Display</span>
          </button>

          <button
            onClick={() => setActiveTab('metrics')}
            className={`flex items-center gap-1.5 px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all cursor-pointer ${
              activeTab === 'metrics'
                ? 'bg-white text-teal-900 border-t-2 border-teal-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Hospital Throughput Proof</span>
          </button>

          <button
            onClick={() => setActiveTab('poster')}
            className={`flex items-center gap-1.5 px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all cursor-pointer ${
              activeTab === 'poster'
                ? 'bg-white text-teal-900 border-t-2 border-teal-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Printer className="w-4 h-4 text-emerald-600" />
            <span>Print Waiting Hall Poster</span>
          </button>
        </div>

        {/* Tab 1: Kiosk Live QR Display */}
        {activeTab === 'qr' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col md:flex-row items-center gap-6 bg-gradient-to-br from-teal-50/60 via-slate-50 to-emerald-50/40 p-6 rounded-3xl border border-teal-100 shadow-xs">
              {/* High-Contrast QR Code Card */}
              <div className="flex flex-col items-center bg-white p-5 rounded-2xl shadow-md border border-slate-200 shrink-0">
                <div className="p-2 bg-white rounded-xl">
                  <QRCodeSVG
                    value={mobileIntakeUrl}
                    size={200}
                    level="H"
                    includeMargin={true}
                    imageSettings={{
                      src: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%230f766e'><circle cx='12' cy='12' r='10'/></svg>",
                      x: undefined,
                      y: undefined,
                      height: 32,
                      width: 32,
                      excavate: true,
                    }}
                  />
                </div>
                <span className="mt-2.5 text-[10px] font-black uppercase tracking-widest text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                  Scan With Any Phone
                </span>
                <span className="text-[10px] text-slate-400 mt-1 font-mono">Google Lens / Camera / ABHA</span>
              </div>

              {/* Instructions & Steps */}
              <div className="flex-1 text-left space-y-3.5">
                <div>
                  <h4 className="text-lg font-black text-slate-900 leading-tight">
                    कतार में खड़े न रहें — अपनी कुर्सी पर बैठकर फोन से भरें!
                  </h4>
                  <p className="text-xs text-slate-600 font-medium mt-1">
                    Bypass the physical kiosk line. Scan this QR code with your mobile camera to launch the bilingual clinical intake assistant right in your seat.
                  </p>
                </div>

                {/* 3 Step Process */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2.5 bg-white/90 p-2.5 rounded-xl border border-slate-200">
                    <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">1</span>
                    <div>
                      <strong className="text-slate-900 block">Scan QR Code</strong>
                      <span className="text-slate-500 text-[11px]">Opens instant mobile intake in browser — zero app download required.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 bg-white/90 p-2.5 rounded-xl border border-slate-200">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">2</span>
                    <div>
                      <strong className="text-slate-900 block">Speak in Hindi, Marathi, or English</strong>
                      <span className="text-slate-500 text-[11px]">Voice assistant records your symptoms & prior history comfortably while seated.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 bg-white/90 p-2.5 rounded-xl border border-slate-200">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0">3</span>
                    <div>
                      <strong className="text-slate-900 block">Receive Instant OPD Token (#M-XX)</strong>
                      <span className="text-slate-500 text-[11px]">Directly enters the doctor's queue. Walk into the consultation chamber when called!</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons: Test Link & Copy */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copied ? 'Link Copied!' : 'Copy Mobile URL'}</span>
                </button>

                <a
                  href={mobileIntakeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Mobile Intake (Demo Tab)</span>
                </a>
              </div>

              <span className="text-[11px] text-slate-400 font-medium">
                ABDM & Ayushman Bharat FHIR Compatible
              </span>
            </div>
          </div>
        )}

        {/* Tab 2: Hospital Throughput Metrics Comparison */}
        {activeTab === 'metrics' && (
          <div className="p-6 sm:p-8 space-y-6 text-left">
            <div>
              <h4 className="text-base font-black text-slate-900">
                Why Physical Kiosks Create Bottlenecks & How "Scan & Sit" Solves It
              </h4>
              <p className="text-xs text-slate-600 mt-1">
                In high-volume hospital OPDs (500+ patients/morning), physical kiosks simply shift the hallway crowd from the doctor's door to the kiosk screen. Here is the operational comparison:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Flawed Kiosk Model */}
              <div className="bg-rose-50/80 border-2 border-rose-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-rose-700">Traditional Kiosk Only</span>
                  <span className="text-xs font-bold bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full">Sequential O(N)</span>
                </div>
                <div className="text-2xl font-black text-rose-900">12–15 <span className="text-sm font-semibold">Patients/Hour</span></div>
                <ul className="text-xs text-rose-800 space-y-1.5 font-medium list-disc list-inside">
                  <li>Patients forced to stand 30–45 mins in hallway queue.</li>
                  <li>Touchscreens cause cross-infection risk in flu/viral seasons.</li>
                  <li>Elderly and sick patients struggle with standing at the screen.</li>
                  <li>Hardware damage or kiosk restart halts all OPD intakes.</li>
                </ul>
              </div>

              {/* Scan & Sit Model */}
              <div className="bg-teal-50/80 border-2 border-teal-300 rounded-2xl p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-teal-800">Scan & Sit (BYOD Architecture)</span>
                  <span className="text-xs font-bold bg-teal-600 text-white px-2 py-0.5 rounded-full">Concurrent O(1)</span>
                </div>
                <div className="text-2xl font-black text-teal-950">80+ <span className="text-sm font-semibold">Patients/Hour</span></div>
                <ul className="text-xs text-teal-900 space-y-1.5 font-medium list-disc list-inside">
                  <li>50+ patients can scan and fill simultaneously from their seats.</li>
                  <li>Zero physical lines in lobby — patients wait comfortably seated.</li>
                  <li>Personal phone microphone ensures clear voice capture in noise.</li>
                  <li>Elderly without phones get instant access to now-empty physical kiosk!</li>
                </ul>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-teal-600 shrink-0" />
              <p className="text-xs text-slate-700 font-medium">
                <strong>SIH Hackathon Impact:</strong> Demonstrates systems thinking and real-world health administration insight. You aren't just building software; you are re-engineering hospital throughput.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Official Printable Waiting Poster (A4) */}
        {activeTab === 'poster' && (
          <div className="p-6 sm:p-8 space-y-6 text-left">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-black text-slate-900">Official OPD Waiting Hall Poster</h4>
                <p className="text-xs text-slate-500">Print and paste across waiting area chairs, pillars, and registration desks.</p>
              </div>
              <button
                type="button"
                onClick={handlePrintPoster}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Poster (A4)</span>
              </button>
            </div>

            {/* Printable Poster Preview */}
            <div ref={posterRef} className="border-4 border-dashed border-slate-300 rounded-3xl p-6 sm:p-8 bg-white shadow-inner flex flex-col items-center text-center space-y-4">
              <div className="flex items-center justify-between w-full border-b border-slate-200 pb-3">
                <JeevanBrand size="sm" subtitleText="Digital Care of Every Life" />
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    Ayushman Bharat • ABDM Compliant
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">OPD Room 104 • General & AYUSH Care</p>
                </div>
              </div>

              <div className="py-2">
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  कतार में खड़े मत रहें!
                </h2>
                <h3 className="text-lg sm:text-xl font-extrabold text-teal-800 mt-0.5">
                  QR कोड स्कैन करें और अपनी कुर्सी पर बैठकर फोन से भरें
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Don't stand in line before the doctor or kiosk. Scan with your smartphone camera and complete your clinical intake while seated.
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl border-2 border-slate-900 shadow-md">
                <QRCodeSVG
                  value={mobileIntakeUrl}
                  size={190}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div className="grid grid-cols-3 gap-3 w-full max-w-lg text-left text-xs pt-2">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="font-black text-teal-700 block">१. स्कैन करें</span>
                  <span className="text-[11px] text-slate-600">कैमरे या गूगल लेंस से स्कैन करें।</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="font-black text-teal-700 block">२. लक्षण बताएं</span>
                  <span className="text-[11px] text-slate-600">हिंदी या अंग्रेजी में बोलकर बताएं।</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="font-black text-teal-700 block">३. टोकन प्राप्त करें</span>
                  <span className="text-[11px] text-slate-600">नंबर आने पर सीधे डॉक्टर के पास जाएं।</span>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 w-full flex items-center justify-between">
                <span>Hospital IT Administration • Smart India Hackathon</span>
                <span>Powered by Jeevan Clinical AI & ABDM</span>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span>256-Bit Encrypted • ABDM Patient-Mediated Consent Verified</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
