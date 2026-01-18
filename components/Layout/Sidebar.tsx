import React, { useState } from 'react';
// @ts-ignore - Resolving TS error for missing exported members
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Settings, 
  LayoutGrid, 
  Star, 
  Bookmark, 
  Search,
  User,
  Key,
  ChevronDown
} from 'lucide-react';
import { BRAND_ASSETS, SPREADSHEET_CONFIG } from '../../assets';

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onMobileClose }) => {
  const [isHoverExpanded, setIsHoverExpanded] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: 'Library', path: '/', icon: LayoutGrid },
    { name: 'Favorite', path: '/favorite', icon: Star },
    { name: 'Bookmark', path: '/bookmark', icon: Bookmark },
    { name: 'Research', path: '/research', icon: Search },
  ];

  // Combined state: expanded if hovered on desktop, or if it's open on mobile
  const isExpanded = isHoverExpanded || isMobileOpen;

  const sidebarStyle: React.CSSProperties = {
    background: 'linear-gradient(to bottom, #FFFFFF 0%, #FFFFFF 25%, #004A74 100%)',
  };

  const handleExploreClick = async () => {
    const spreadsheetUrl = SPREADSHEET_CONFIG.EXPLORE_MAINDI_CSV;
    if (onMobileClose) onMobileClose(); // Close sidebar first
    
    // PWA Fix: Open window immediately to preserve user gesture context before the async fetch
    const newWindow = window.open('about:blank', '_blank');
    
    try {
      const response = await fetch(spreadsheetUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      const csvData = await response.text();
      const firstLine = csvData.split('\n')[0];
      const targetLink = firstLine.split(',')[0].replace(/"/g, '').trim();
      
      const finalLink = (targetLink && targetLink.startsWith('http')) 
        ? targetLink 
        : SPREADSHEET_CONFIG.EXPLORE_MAINDI_FALLBACK;
      
      if (newWindow) {
        newWindow.location.href = finalLink;
      } else {
        // Fallback for browsers that block the above
        window.open(finalLink, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      console.error('Failed to fetch link from A1:', e);
      const fallback = SPREADSHEET_CONFIG.EXPLORE_MAINDI_FALLBACK;
      if (newWindow) {
        newWindow.location.href = fallback;
      } else {
        window.open(fallback, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const handleNavClick = () => {
    if (onMobileClose) onMobileClose();
  };

  return (
    <aside 
      className={`fixed lg:sticky top-0 left-0 h-[100dvh] flex flex-col z-[100] transition-all duration-500 ease-in-out rounded-r-[1.5rem] lg:rounded-r-[2rem] shadow-[8px_0_25px_-5px_rgba(0,0,0,0.1)] overflow-hidden ${
        isExpanded ? 'w-52 md:w-56' : 'w-0 lg:w-16'
      } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      style={sidebarStyle}
      onMouseEnter={() => setIsHoverExpanded(true)}
      onMouseLeave={() => {
        setIsHoverExpanded(false);
        setSettingsMenuOpen(false);
      }}
    >
      {/* Top: Logo Section */}
      <div className="relative h-20 lg:h-24 flex items-center justify-center overflow-hidden shrink-0">
        <div 
          className={`absolute transition-all duration-700 ease-in-out transform ${
            isExpanded 
              ? 'opacity-0 -translate-x-12 -rotate-180 pointer-events-none' 
              : 'opacity-100 translate-x-0 rotate-0'
          }`}
        >
          <img 
            src={BRAND_ASSETS.LOGO_ICON} 
            className="w-8 lg:w-10 h-8 lg:h-10 object-contain"
            alt="Xeenaps Icon"
          />
        </div>

        {/* Adjusted Logo Full with more padding for smaller appearance */}
        <div 
          className={`absolute inset-0 flex items-center justify-center p-10 lg:p-12 transition-all duration-700 ease-in-out transform ${
            isExpanded 
              ? 'opacity-100 translate-x-0 scale-100' 
              : 'opacity-0 -translate-x-12 scale-90 pointer-events-none'
          }`}
        >
          <img 
            src={BRAND_ASSETS.LOGO_FULL} 
            className="w-full h-auto object-contain"
            alt="Xeenaps Full"
          />
        </div>
      </div>

      {/* Menu Area */}
      <nav className="flex-1 mt-4 lg:mt-6 px-2 space-y-1 lg:space-y-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={handleNavClick}
              className={`relative w-full group flex items-center p-2 md:p-2.5 rounded-xl transition-all duration-300 transform active:scale-95 overflow-hidden ${
                isActive 
                  ? 'bg-[#FED400] text-[#004A74] shadow-md' 
                  : 'text-gray-500 hover:bg-[#FED400]/5 hover:text-[#004A74]'
              }`}
            >
              <div className="shrink-0 flex items-center justify-center w-7 md:w-8 group-hover:scale-110 transition-transform duration-300">
                <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} className="lg:w-5 lg:h-5" />
              </div>
              <div className={`ml-2 overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0'}`}>
                <span className="text-xs md:text-sm font-semibold whitespace-nowrap">{item.name}</span>
              </div>
              {!isActive && (
                <div className="absolute bottom-0 left-9 lg:left-10 right-0 h-0.5 bg-[#FED400] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              )}
            </NavLink>
          );
        })}

        <div className="relative pt-1 lg:pt-2">
          <button 
            onClick={() => isExpanded && setSettingsMenuOpen(!settingsMenuOpen)}
            className={`w-full group flex items-center p-2 md:p-2.5 rounded-xl transition-all duration-300 transform active:scale-95 ${
              settingsMenuOpen ? 'bg-[#FED400] text-[#004A74] shadow-md' : 'text-gray-500 hover:bg-[#FED400]/5 hover:text-[#004A74]'
            }`}
          >
            <div className="shrink-0 flex items-center justify-center w-7 md:w-8 group-hover:rotate-45 transition-transform duration-500">
              <Settings size={18} className="lg:w-5 lg:h-5" />
            </div>
            <div className={`flex-1 ml-2 flex items-center justify-between overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0'}`}>
              <span className="text-xs md:text-sm font-semibold whitespace-nowrap">Settings</span>
              <ChevronDown size={14} className={`transition-transform duration-300 ${settingsMenuOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>

          <div className={`overflow-hidden transition-all duration-500 ease-in-out space-y-1 mt-1 ${settingsMenuOpen && isExpanded ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0 invisible'}`}>
            <NavLink 
              to="/profile"
              onClick={handleNavClick}
              className="w-full flex items-center p-2 pl-9 lg:pl-10 rounded-lg text-gray-500 hover:text-[#004A74] hover:bg-[#FED400]/5 transition-all text-xs md:text-sm font-medium"
            >
              <User size={16} className="mr-2 shrink-0" />
              <span className="whitespace-nowrap">Profile</span>
            </NavLink>
            <button 
              onClick={async () => {
                handleNavClick();
                if (window.aistudio?.openSelectKey) {
                  await window.aistudio.openSelectKey();
                }
              }}
              className="w-full flex items-center p-2 pl-9 lg:pl-10 rounded-lg text-gray-500 hover:text-[#004A74] hover:bg-[#FED400]/5 transition-all text-xs md:text-sm font-medium text-left"
            >
              <Key size={16} className="mr-2 shrink-0" />
              <span className="whitespace-nowrap">AI Key</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Bottom Area */}
      <div className="shrink-0 flex flex-col">
        <div className="border-t border-white/20 mx-4" />
        <div className="px-2 pt-2 mb-4 lg:mb-6 space-y-0.5">
          <button 
            onClick={handleExploreClick}
            className="w-full group flex items-center p-2 md:p-2.5 rounded-xl transition-all duration-300 transform active:scale-95 text-white/90 hover:bg-white/10 hover:text-[#FED400] outline-none"
          >
            <div className="shrink-0 flex items-center justify-center w-7 md:w-8 group-hover:scale-110 transition-transform duration-300">
              <img 
                src={BRAND_ASSETS.MAINDI_LOGO} 
                className="w-5 lg:w-6 h-5 lg:h-6 object-contain" 
                alt="Maindi" 
              />
            </div>
            <div className={`ml-2 overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'opacity-100 max-w-xs' : 'opacity-0 max-w-0'}`}>
              <span className="text-xs md:text-sm font-bold whitespace-nowrap">Explore Maindi</span>
            </div>
          </button>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;