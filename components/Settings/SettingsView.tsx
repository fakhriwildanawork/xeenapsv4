
import React, { useState } from 'react';
import { 
  Cog6ToothIcon, 
  TableCellsIcon, 
  CloudArrowUpIcon,
  ShieldCheckIcon,
  ExclamationCircleIcon,
  SparklesIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { GAS_WEB_APP_URL } from '../../constants';
import { initializeDatabase } from '../../services/gasService';
import { showXeenapsAlert } from '../../utils/swalUtils';

const SettingsView: React.FC = () => {
  const isConfigured = !!GAS_WEB_APP_URL;
  const [isInitializing, setIsInitializing] = useState(false);

  const SPREADSHEET_IDS = {
    LIBRARY: '1wPTMx6yrv2iv0lejpNdClmC162aD3iekzSWP5EPNm0I',
    KEYS: '1QRzqKe42ck2HhkA-_yAGS-UHppp96go3s5oJmlrwpc0'
  };

  const openSheet = (id: string) => {
    window.open(`https://docs.google.com/spreadsheets/d/${id}`, '_blank');
  };

  const handleInitDatabase = async () => {
    setIsInitializing(true);
    try {
      const result = await initializeDatabase();
      if (result.status === 'success') {
        showXeenapsAlert({
          icon: 'success',
          title: 'DATABASE READY',
          text: 'The "Collections" sheet has been created with all 40+ required columns. You can start adding items now.',
          confirmButtonText: 'GREAT'
        });
      } else {
        throw new Error(result.message);
      }
    } catch (err: any) {
      showXeenapsAlert({
        icon: 'error',
        title: 'SETUP FAILED',
        text: err.message || 'Could not initialize database. Check your GAS connection.',
        confirmButtonText: 'OK'
      });
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="glass p-8 rounded-[2rem] border-white/40 shadow-2xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-[#004A74] text-[#FED400] rounded-2xl flex items-center justify-center shadow-lg shadow-[#004A74]/20">
            <Cog6ToothIcon className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-[#004A74] tracking-tight">System Settings</h2>
            <p className="text-gray-500 font-medium">Manage your private cloud infrastructure</p>
          </div>
        </div>

        {/* Database Auto-Setup Section */}
        <div className="mb-10 p-8 bg-gradient-to-br from-[#004A74] to-[#003859] rounded-[2.5rem] text-white shadow-xl relative overflow-hidden group">
          <SparklesIcon className="absolute -right-10 -top-10 w-40 h-40 text-white/5 group-hover:rotate-12 transition-transform duration-1000" />
          <div className="relative z-10">
            <h3 className="text-xl font-black mb-2 flex items-center gap-2">
              <TableCellsIcon className="w-6 h-6 text-[#FED400]" />
              Database Auto-Setup
            </h3>
            <p className="text-white/70 text-sm mb-6 max-w-md">
              Automatically create the "Collections" sheet and all required academic citation columns (APA, Harvard, Chicago) in your Google Sheets.
            </p>
            <button 
              onClick={handleInitDatabase}
              disabled={isInitializing || !isConfigured}
              className="px-8 py-4 bg-[#FED400] text-[#004A74] rounded-2xl font-black uppercase tracking-widest text-xs flex items-center gap-3 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
            >
              {isInitializing ? (
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
              ) : (
                <SparklesIcon className="w-5 h-5" />
              )}
              {isInitializing ? 'Initializing...' : 'Initialize Database Structure'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className={`p-6 rounded-3xl border ${isConfigured ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'} transition-all`}>
            <div className="flex items-center gap-3 mb-4">
              {isConfigured ? (
                <ShieldCheckIcon className="w-6 h-6 text-green-600" />
              ) : (
                <ExclamationCircleIcon className="w-6 h-6 text-red-700" />
              )}
              <h3 className={`font-bold ${isConfigured ? 'text-green-700' : 'text-red-700'}`}>Connection Status</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              {isConfigured 
                ? 'Backend GAS berhasil terhubung. Aplikasi siap melakukan sinkronisasi data.' 
                : 'VITE_GAS_URL belum terdeteksi. Silakan cek Environment Variables di Vercel.'}
            </p>
          </div>

          <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100">
            <div className="flex items-center gap-3 mb-4">
              <CloudArrowUpIcon className="w-6 h-6 text-[#004A74]" />
              <h3 className="font-bold text-[#004A74]">AI Engine (Gemini Flash)</h3>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              Model aktif: <span className="font-mono font-bold">gemini-3-flash-preview</span>. 
              Sistem menggunakan rotasi otomatis dari database spreadsheet Anda.
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-black text-[#004A74] mb-6 flex items-center gap-2">
            <TableCellsIcon className="w-6 h-6" />
            Manual Database Access
          </h3>
          
          <div className="space-y-4">
            <button 
              onClick={() => openSheet(SPREADSHEET_IDS.KEYS)}
              className="w-full group flex items-center justify-between p-6 bg-white/40 hover:bg-[#FED400] rounded-2xl border border-white/60 transition-all duration-500 text-left shadow-sm"
            >
              <div>
                <h4 className="font-bold text-[#004A74] group-hover:scale-105 transition-transform origin-left">Audit Key Database</h4>
                <p className="text-sm text-gray-500 group-hover:text-[#004A74]/70">Review, disable, or delete active keys in your pool.</p>
              </div>
              <TableCellsIcon className="w-8 h-8 opacity-20 group-hover:opacity-100 transition-opacity" />
            </button>

            <button 
              onClick={() => openSheet(SPREADSHEET_IDS.LIBRARY)}
              className="w-full group flex items-center justify-between p-6 bg-white/40 hover:bg-[#004A74] rounded-2xl border border-white/60 transition-all duration-500 text-left shadow-sm"
            >
              <div>
                <h4 className="font-bold text-[#004A74] group-hover:text-white group-hover:scale-105 transition-all origin-left">Master Library Database</h4>
                <p className="text-sm text-gray-500 group-hover:text-white/70">Access raw collection data and full system backups.</p>
              </div>
              <TableCellsIcon className="w-8 h-8 opacity-20 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>
      </div>

      <div className="text-center pb-8">
        <p className="text-xs text-gray-400 font-medium tracking-widest uppercase">
          Xeenaps v1.0.0 • Personal Knowledge Management System
        </p>
      </div>
    </div>
  );
};

export default SettingsView;
