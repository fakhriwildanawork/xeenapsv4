
import React, { useState, useEffect } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
// @ts-ignore
import { useLocation } from 'react-router-dom';
import { BRAND_ASSETS, SPREADSHEET_CONFIG } from '../../assets';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onRefresh?: () => Promise<void>;
}

const Header: React.FC<HeaderProps> = ({ searchQuery, setSearchQuery, onRefresh }) => {
  const location = useLocation();
  const [tutorialLink, setTutorialLink] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mapping path to Tutorial ID from Spreadsheet
  const getTutorialId = (pathname: string): string => {
    if (pathname === '/add') return 'AddLibrary';
    if (pathname === '/settings') return 'Settings';
    if (pathname === '/' || pathname === '/favorite' || pathname === '/bookmark' || pathname === '/research') {
      return 'MainLibrary';
    }
    return 'General';
  };

  useEffect(() => {
    const fetchTutorialLink = async () => {
      const tutorialId = getTutorialId(location.pathname);
      const spreadsheetUrl = SPREADSHEET_CONFIG.TUTORIAL_CSV;
      
      try {
        const response = await fetch(spreadsheetUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        const csvData = await response.text();
        const rows = csvData.split('\n');
        
        for (const row of rows) {
          const cols = row.split(',').map(c => c.replace(/"/g, '').trim());
          if (cols[0] === tutorialId) {
            if (cols[2] && cols[2].startsWith('http')) {
              setTutorialLink(cols[2]);
              return;
            }
          }
        }
        setTutorialLink(null);
      } catch (e) {
        console.error('Failed to fetch tutorial link:', e);
        setTutorialLink(null);
      }
    };

    fetchTutorialLink();
  }, [location.pathname]);

  const handleTutorialClick = () => {
    if (tutorialLink) {
      window.open(tutorialLink, '_blank', 'noopener,noreferrer');
    }
  };

  const handleRefreshClick = async () => {
    if (isRefreshing || !onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      // Small delay to ensure the animation is visible
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  const rawName = "Personal User";
  const userName = rawName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  const userPhoto = ""; 
  const placeholderUrl = BRAND_ASSETS.USER_DEFAULT;

  return (
    <header className="sticky top-0 z-[60] w-full py-4 lg:py-6 bg-white/80 backdrop-blur-md flex items-center justify-between border-b border-gray-100/50 px-1">
      <style>{`
        @keyframes refresh-glow {
          0% { color: #ef4444; } /* Red-500 */
          50% { color: #fbbf24; } /* Yellow-400 */
          100% { color: #ef4444; }
        }
        .refresh-loading {
          animation: spin 1s linear infinite, refresh-glow 2s ease-in-out infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Bagian Kiri: Welcome Message */}
      <div className="flex flex-col">
        <span className="text-[9px] md:text-[11px] uppercase font-normal tracking-[0.2em] text-[#004A74] opacity-90">
          WELCOME,
        </span>
        <h1 className="text-xl md:text-3xl font-bold text-[#004A74] leading-tight">
          {userName}!
        </h1>
      </div>

      {/* Bagian Kanan: Icons */}
      <div className="flex items-center gap-1 md:gap-3">
        {/* Refresh Button */}
        <button 
          onClick={handleRefreshClick}
          disabled={isRefreshing}
          className="p-2 text-[#004A74] hover:bg-gray-50 rounded-full transition-all duration-300 outline-none group"
          title="Refresh Data"
        >
          <ArrowPathIcon 
            className={`w-5 h-5 md:w-6 md:h-6 transition-colors duration-500 ${isRefreshing ? 'refresh-loading' : 'group-active:scale-90'}`} 
          />
        </button>

        {/* YouTube Tutorial Icon */}
        {tutorialLink && (
          <button 
            onClick={handleTutorialClick}
            className="p-1 hover:bg-red-50 rounded-full transition-all duration-300 group outline-none"
            title="Watch Tutorial"
          >
            <img 
              src={BRAND_ASSETS.YOUTUBE_ICON} 
              alt="Watch Tutorial" 
              className="w-7 h-7 md:w-8 md:h-8 object-contain transition-transform group-hover:scale-110" 
            />
          </button>
        )}
        
        {/* User Photo with overlay notification dot placeholder */}
        <button className="flex items-center focus:outline-none p-1 relative">
          <div className="relative">
            <div className="w-10 h-10 md:w-11 md:h-11 rounded-full border-2 border-[#FED400] p-0.5 hover:border-[#004A74] transition-colors duration-300 overflow-hidden shadow-sm bg-white">
              <img 
                src={userPhoto || placeholderUrl} 
                alt="User Profile" 
                className="w-full h-full object-cover rounded-full bg-gray-50"
              />
            </div>
            {/* Notification Dot Overlay (Top Right of Photo) */}
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-[#FED400] rounded-full border-2 border-white shadow-sm scale-90"></span>
          </div>
        </button>
      </div>
    </header>
  );
};

export default Header;
