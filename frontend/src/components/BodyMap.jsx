import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';

// SVG paths for body regions (front view)
const FRONT_REGIONS = [
  {
    id: 'head',
    label_en: 'Head',
    label_hi: 'सिर',
    label_mr: 'डोके',
    // circle-ish head
    path: 'M100,10 C116,10 128,22 128,38 C128,54 116,66 100,66 C84,66 72,54 72,38 C72,22 84,10 100,10 Z',
  },
  {
    id: 'neck',
    label_en: 'Neck / Throat',
    label_hi: 'गला / गर्दन',
    label_mr: 'मान / घसा',
    path: 'M91,66 L109,66 L111,80 L89,80 Z',
  },
  {
    id: 'chest',
    label_en: 'Chest',
    label_hi: 'छाती',
    label_mr: 'छाती',
    path: 'M74,82 L126,82 L128,118 L72,118 Z',
  },
  {
    id: 'abdomen',
    label_en: 'Abdomen / Stomach',
    label_hi: 'पेट',
    label_mr: 'पोट',
    path: 'M72,120 L128,120 L126,158 L74,158 Z',
  },
  {
    id: 'groin',
    label_en: 'Groin / Lower Abdomen',
    label_hi: 'नाभि के नीचे / कमर',
    label_mr: 'मांडी / खालचे पोट',
    path: 'M74,160 L126,160 L122,178 L78,178 Z',
  },
  {
    id: 'left_shoulder',
    label_en: 'Left Shoulder',
    label_hi: 'बायाँ कंधा',
    label_mr: 'डावा खांदा',
    path: 'M58,80 L74,80 L74,100 L56,100 Z',
  },
  {
    id: 'right_shoulder',
    label_en: 'Right Shoulder',
    label_hi: 'दायाँ कंधा',
    label_mr: 'उजवा खांदा',
    path: 'M126,80 L142,80 L144,100 L126,100 Z',
  },
  {
    id: 'left_arm',
    label_en: 'Left Arm',
    label_hi: 'बायाँ हाथ',
    label_mr: 'डावा हात',
    path: 'M52,102 L70,102 L66,148 L48,148 Z',
  },
  {
    id: 'right_arm',
    label_en: 'Right Arm',
    label_hi: 'दायाँ हाथ',
    label_mr: 'उजवा हात',
    path: 'M130,102 L148,102 L152,148 L134,148 Z',
  },
  {
    id: 'left_hand',
    label_en: 'Left Hand / Wrist',
    label_hi: 'बायाँ हाथ / कलाई',
    label_mr: 'डावा हात / मनगट',
    path: 'M44,150 L64,150 L62,170 L42,170 Z',
  },
  {
    id: 'right_hand',
    label_en: 'Right Hand / Wrist',
    label_hi: 'दायाँ हाथ / कलाई',
    label_mr: 'उजवा हात / मनगट',
    path: 'M136,150 L156,150 L158,170 L138,170 Z',
  },
  {
    id: 'left_thigh',
    label_en: 'Left Thigh',
    label_hi: 'बायाँ जाँघ',
    label_mr: 'डावी मांडी',
    path: 'M76,180 L98,180 L96,224 L74,224 Z',
  },
  {
    id: 'right_thigh',
    label_en: 'Right Thigh',
    label_hi: 'दायाँ जाँघ',
    label_mr: 'उजवी मांडी',
    path: 'M102,180 L124,180 L126,224 L104,224 Z',
  },
  {
    id: 'left_knee',
    label_en: 'Left Knee',
    label_hi: 'बायाँ घुटना',
    label_mr: 'डावा गुडघा',
    path: 'M74,226 L96,226 L94,244 L72,244 Z',
  },
  {
    id: 'right_knee',
    label_en: 'Right Knee',
    label_hi: 'दायाँ घुटना',
    label_mr: 'उजवा गुडघा',
    path: 'M104,226 L126,226 L128,244 L106,244 Z',
  },
  {
    id: 'left_leg',
    label_en: 'Left Leg / Shin',
    label_hi: 'बायाँ पैर (पिंडली)',
    label_mr: 'डावा पाय',
    path: 'M72,246 L94,246 L92,286 L70,286 Z',
  },
  {
    id: 'right_leg',
    label_en: 'Right Leg / Shin',
    label_hi: 'दायाँ पैर (पिंडली)',
    label_mr: 'उजवा पाय',
    path: 'M106,246 L128,246 L130,286 L108,286 Z',
  },
  {
    id: 'left_foot',
    label_en: 'Left Foot / Ankle',
    label_hi: 'बायाँ पैर / टखना',
    label_mr: 'डावा पाय / घोटा',
    path: 'M68,288 L92,288 L92,302 L60,302 Z',
  },
  {
    id: 'right_foot',
    label_en: 'Right Foot / Ankle',
    label_hi: 'दायाँ पैर / टखना',
    label_mr: 'उजवा पाय / घोटा',
    path: 'M108,288 L132,288 L140,302 L108,302 Z',
  },
];

// SVG paths for back view (mirrored/simplified)
const BACK_REGIONS = [
  {
    id: 'back_head',
    label_en: 'Back of Head',
    label_hi: 'सिर के पीछे',
    label_mr: 'डोक्याचा मागचा भाग',
    path: 'M100,10 C116,10 128,22 128,38 C128,54 116,66 100,66 C84,66 72,54 72,38 C72,22 84,10 100,10 Z',
  },
  {
    id: 'upper_back',
    label_en: 'Upper Back / Shoulders',
    label_hi: 'ऊपरी पीठ / कंधे',
    label_mr: 'वरची पाठ / खांदे',
    path: 'M72,80 L128,80 L128,118 L72,118 Z',
  },
  {
    id: 'lower_back',
    label_en: 'Lower Back / Waist',
    label_hi: 'कमर / पीठ के नीचे',
    label_mr: 'कंबर / पाठीचा खालचा भाग',
    path: 'M72,120 L128,120 L126,160 L74,160 Z',
  },
  {
    id: 'buttocks',
    label_en: 'Buttocks / Hip',
    label_hi: 'नितंब / कूल्हा',
    label_mr: 'नितंब / कुल्ला',
    path: 'M74,162 L100,162 L98,180 L76,180 Z',
  },
  {
    id: 'buttocks_r',
    label_en: 'Buttocks / Hip (Right)',
    label_hi: 'नितंब / कूल्हा (दाया)',
    label_mr: 'नितंब / कुल्ला (उजवा)',
    path: 'M100,162 L126,162 L124,180 L102,180 Z',
  },
  {
    id: 'back_left_arm',
    label_en: 'Left Arm (Back)',
    label_hi: 'बायाँ हाथ (पीछे)',
    label_mr: 'डावा हात (मागे)',
    path: 'M52,82 L70,82 L66,148 L48,148 Z',
  },
  {
    id: 'back_right_arm',
    label_en: 'Right Arm (Back)',
    label_hi: 'दायाँ हाथ (पीछे)',
    label_mr: 'उजवा हात (मागे)',
    path: 'M130,82 L148,82 L152,148 L134,148 Z',
  },
  {
    id: 'back_left_thigh',
    label_en: 'Back of Left Thigh',
    label_hi: 'बायाँ जाँघ (पीछे)',
    label_mr: 'डावी मांडी (मागे)',
    path: 'M76,182 L98,182 L96,224 L74,224 Z',
  },
  {
    id: 'back_right_thigh',
    label_en: 'Back of Right Thigh',
    label_hi: 'दायाँ जाँघ (पीछे)',
    label_mr: 'उजवी मांडी (मागे)',
    path: 'M102,182 L124,182 L126,224 L104,224 Z',
  },
  {
    id: 'back_left_knee',
    label_en: 'Back of Left Knee',
    label_hi: 'बायाँ घुटना (पीछे)',
    label_mr: 'डावा गुडघा (मागे)',
    path: 'M74,226 L96,226 L94,244 L72,244 Z',
  },
  {
    id: 'back_right_knee',
    label_en: 'Back of Right Knee',
    label_hi: 'दायाँ घुटना (पीछे)',
    label_mr: 'उजवा गुडघा (मागे)',
    path: 'M104,226 L126,226 L128,244 L106,244 Z',
  },
  {
    id: 'back_left_calf',
    label_en: 'Left Calf',
    label_hi: 'बायाँ पैर (पिंडली)',
    label_mr: 'डावा पाय (वासरू)',
    path: 'M72,246 L94,246 L92,286 L70,286 Z',
  },
  {
    id: 'back_right_calf',
    label_en: 'Right Calf',
    label_hi: 'दायाँ पैर (पिंडली)',
    label_mr: 'उजवा पाय (वासरू)',
    path: 'M106,246 L128,246 L130,286 L108,286 Z',
  },
];

const LABEL_KEY = { en: 'label_en', hi: 'label_hi', mr: 'label_mr' };

export function BodyMap({ onSelect, lang = 'en' }) {
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState('front'); // 'front' | 'back'
  const [hovered, setHovered] = useState(null);

  const regions = view === 'front' ? FRONT_REGIONS : BACK_REGIONS;
  const lk = LABEL_KEY[lang] || 'label_en';

  const labels = {
    front: { en: 'Front', hi: 'आगे', mr: 'पुढे' },
    back: { en: 'Back', hi: 'पीछे', mr: 'मागे' },
    tap: { en: 'Tap where it hurts', hi: 'जहाँ दर्द हो वहाँ टैप करें', mr: 'जिथे दुखते तिथे टॅप करा' },
    confirm: { en: 'Confirm', hi: 'पुष्टि करें', mr: 'पुष्टी करा' },
    reset: { en: 'Reset', hi: 'फिर से चुनें', mr: 'पुन्हा निवडा' },
  };

  const getLabel = (key) => labels[key]?.[lang] || labels[key]?.en || '';

  const handleRegionClick = (region) => {
    setSelected(region.id);
    // Auto-confirm after 300ms to give visual feedback
    setTimeout(() => {
      onSelect(region.id, region[lk]);
    }, 320);
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* View toggle */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 border border-slate-200">
        {['front', 'back'].map((v) => (
          <button
            key={v}
            onClick={() => { setView(v); setSelected(null); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              view === v
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {v === 'front' ? getLabel('front') : getLabel('back')}
          </button>
        ))}
      </div>

      {/* Instruction */}
      <p className="text-xs text-teal-700 font-semibold text-center">
        {getLabel('tap')}
      </p>

      {/* SVG Body */}
      <div className="relative">
        <svg
          viewBox="0 0 200 310"
          className="w-36 h-auto drop-shadow-sm"
        >
          {/* Body outline background */}
          <ellipse cx="100" cy="38" rx="30" ry="28" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
          <rect x="72" y="66" width="56" height="14" rx="4" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.5" />
          {/* Torso */}
          <rect x="68" y="80" width="64" height="100" rx="6" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
          {/* Arms */}
          <rect x="44" y="80" width="22" height="90" rx="8" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.5" />
          <rect x="134" y="80" width="22" height="90" rx="8" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.5" />
          {/* Legs */}
          <rect x="70" y="180" width="28" height="122" rx="8" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
          <rect x="102" y="180" width="28" height="122" rx="8" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />

          {/* Interactive regions */}
          {regions.map((region) => {
            const isSelected = selected === region.id;
            const isHovered = hovered === region.id;
            return (
              <path
                key={region.id}
                d={region.path}
                onClick={() => handleRegionClick(region)}
                onMouseEnter={() => setHovered(region.id)}
                onMouseLeave={() => setHovered(null)}
                className="cursor-pointer transition-all duration-150"
                fill={
                  isSelected
                    ? 'rgba(239,68,68,0.82)'
                    : isHovered
                    ? 'rgba(99,102,241,0.55)'
                    : 'rgba(99,102,241,0.08)'
                }
                stroke={
                  isSelected
                    ? '#ef4444'
                    : isHovered
                    ? '#818cf8'
                    : 'rgba(99,102,241,0.3)'
                }
                strokeWidth={isSelected ? 2 : 1}
                style={{
                  filter: isSelected
                    ? 'drop-shadow(0 0 8px rgba(239,68,68,0.7))'
                    : isHovered
                    ? 'drop-shadow(0 0 4px rgba(99,102,241,0.5))'
                    : 'none',
                }}
              />
            );
          })}
        </svg>
      </div>

      {/* Selected region display */}
      {selected && (
        <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/40 rounded-xl px-4 py-2 animate-in fade-in slide-in-from-bottom-1">
          <span className="text-red-400 font-bold text-sm">📍</span>
          <span className="text-red-300 font-semibold text-sm">
            {regions.find((r) => r.id === selected)?.[lk]}
          </span>
          <button
            onClick={() => setSelected(null)}
            className="ml-2 text-slate-500 hover:text-slate-300 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tooltip for hover */}
      {hovered && !selected && (
        <p className="text-xs text-indigo-300 font-medium animate-in fade-in">
          {regions.find((r) => r.id === hovered)?.[lk]}
        </p>
      )}
    </div>
  );
}
