import React from 'react';
import { ShieldCheck, Download, Printer, CheckCircle2, User, Phone, Calendar, MapPin, QrCode } from 'lucide-react';

const AbhaCard = ({ profile, onDownload, compact = false }) => {
  if (!profile) return null;

  const abhaNumber = profile.abha_number || '91-4582-7491-0382';
  const abhaAddress = profile.abha_address || 'patient@abdm';
  const name = profile.name || 'Ayushman Citizen';
  const gender = profile.gender === 'M' ? 'Male / पुरुष' : (profile.gender === 'F' ? 'Female / महिला' : 'Other');
  const dob = profile.dob || profile.year_of_birth || '1990';
  const mobile = profile.mobile ? `+91 ${profile.mobile.slice(0, 5)} ${profile.mobile.slice(5)}` : '+91 98765 43210';
  const state = profile.state || 'India';
  const photo = profile.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name.replace(/\s+/g, '')}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-md mx-auto my-2 select-none">
      {/* Official Government of India ABDM Health Card Container */}
      <div id="official-abha-card" className="bg-gradient-to-br from-amber-50/60 via-white to-emerald-50/50 border-2 border-slate-300 rounded-2xl shadow-xl overflow-hidden relative">
        
        {/* Top Tricolor Strip */}
        <div className="h-2 w-full flex">
          <div className="w-1/3 bg-orange-500" />
          <div className="w-1/3 bg-white" />
          <div className="w-1/3 bg-emerald-600" />
        </div>

        {/* Card Header */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
              <ShieldCheck className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black tracking-widest text-amber-300 leading-tight">
                National Health Authority (NHA)
              </p>
              <h3 className="text-xs font-black tracking-tight text-white flex items-center gap-1">
                ABHA · आयुष्मान भारत स्वास्थ्य खाता
              </h3>
            </div>
          </div>
          <span className="text-[9px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 px-2 py-0.5 rounded-full">
            ABDM Verified
          </span>
        </div>

        {/* Card Body */}
        <div className="p-4 relative">
          {/* Subtle Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none">
            <ShieldCheck className="w-44 h-44 text-teal-900" />
          </div>

          <div className="flex items-start gap-3.5 relative z-10">
            {/* Patient Photo */}
            <div className="relative shrink-0">
              <img 
                src={photo} 
                alt={name} 
                className="w-20 h-24 object-cover rounded-xl border-2 border-teal-700/30 shadow-md bg-white"
              />
              <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-0.5 shadow">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Demographics */}
            <div className="flex-1 min-w-0 space-y-1">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Citizen Name</p>
                <h4 className="text-sm font-black text-slate-900 truncate">{name}</h4>
              </div>

              <div className="grid grid-cols-2 gap-1 text-[11px] pt-0.5">
                <div>
                  <span className="text-slate-400 text-[10px]">DOB / जन्म तिथि:</span>
                  <p className="font-bold text-slate-800">{dob}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Gender / लिंग:</span>
                  <p className="font-bold text-slate-800">{gender}</p>
                </div>
              </div>

              <div className="text-[11px] pt-0.5">
                <span className="text-slate-400 text-[10px]">Mobile / मोबाइल:</span>
                <p className="font-mono font-bold text-slate-800">{mobile}</p>
              </div>
            </div>
          </div>

          {/* ABHA Identifier Strip */}
          <div className="mt-3.5 pt-3 border-t border-dashed border-slate-200 grid grid-cols-3 gap-2 items-center bg-slate-50/80 -mx-4 -mb-4 p-3.5">
            <div className="col-span-2 space-y-1">
              <div>
                <p className="text-[9px] font-black uppercase text-teal-700 tracking-wider">
                  ABHA Number (14-Digit Health ID)
                </p>
                <p className="text-base font-black font-mono tracking-wider text-slate-900">
                  {abhaNumber}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  ABHA Address
                </p>
                <p className="text-xs font-bold text-indigo-700 font-mono">
                  {abhaAddress}
                </p>
              </div>
            </div>

            {/* Simulated Scannable QR Code */}
            <div className="flex flex-col items-center justify-center p-1.5 bg-white border border-slate-200 rounded-xl shadow-xs">
              <svg className="w-14 h-14 text-slate-900" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14-2h4v2h-4v-2zm-4 0h2v4h-2v-4zm2 4h2v4h-2v-4zm2 2h4v2h-4v-2zm0-4h2v2h-2v-2zM6 6h0v0h0V6zm12 0h0v0h0V6zM6 18h0v0h0v0z"/>
              </svg>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter mt-0.5">
                Scan to Verify
              </span>
            </div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="h-1.5 w-full flex">
          <div className="w-1/3 bg-orange-500" />
          <div className="w-1/3 bg-white" />
          <div className="w-1/3 bg-emerald-600" />
        </div>
      </div>

      {/* Action Buttons */}
      {!compact && (
        <div className="mt-2.5 flex items-center justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold transition shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            Print Card
          </button>
          <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px] bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Aadhaar Demo-Authenticated
          </span>
        </div>
      )}
    </div>
  );
};

export default AbhaCard;
