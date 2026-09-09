import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Thermometer, Flame } from 'lucide-react';

import { useGlobalState } from '../context/GlobalStateContext';

const Home = () => {
  const navigate = useNavigate();
  const { updateState } = useGlobalState();
  const currentSession = sessionStorage.getItem('session_id');

  useEffect(() => {
    if (!currentSession) {
      navigate('/');
    }
  }, [currentSession, navigate]);

  const handleSelect = (complaint) => {
    sessionStorage.setItem('pending_complaint', complaint);
    updateState({ complaint: complaint });
    navigate('/ayush');
  };

  return (
    <div className="flex flex-col items-center flex-1 font-sans p-6 text-slate-800">
      <div className="w-full max-w-md pt-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Start Medical Intake</h1>
        <p className="text-slate-600 mb-8">What is the primary symptom? Selecting a complaint will begin the structured clinical intake sequence.</p>

        <div className="space-y-4">
          <button onClick={() => handleSelect('abdominal-pain')} className="w-full p-6 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all flex items-center group active:scale-[0.98]">
            <div className="bg-orange-100 p-4 rounded-xl text-orange-600 group-hover:bg-orange-200 transition-colors"><Activity className="w-8 h-8" /></div>
            <div className="ml-4 text-left"><h2 className="text-xl font-bold text-slate-800">Abdominal Pain</h2><p className="text-sm text-slate-500">Stomach ache, cramps, etc.</p></div>
          </button>
          <button onClick={() => handleSelect('chest-pain')} className="w-full p-6 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all flex items-center group active:scale-[0.98]">
            <div className="bg-red-100 p-4 rounded-xl text-red-600 group-hover:bg-red-200 transition-colors"><Flame className="w-8 h-8" /></div>
            <div className="ml-4 text-left"><h2 className="text-xl font-bold text-slate-800">Chest Pain</h2><p className="text-sm text-slate-500">Tightness, pressure</p></div>
          </button>
          <button onClick={() => handleSelect('fever')} className="w-full p-6 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all flex items-center group active:scale-[0.98]">
            <div className="bg-blue-100 p-4 rounded-xl text-blue-600 group-hover:bg-blue-200 transition-colors"><Thermometer className="w-8 h-8" /></div>
            <div className="ml-4 text-left"><h2 className="text-xl font-bold text-slate-800">Fever</h2><p className="text-sm text-slate-500">High temperature, chills</p></div>
          </button>
        </div>
      </div>
    </div>
  );
};
export default Home;
