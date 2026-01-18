import React from 'react';
import { ChevronDownIcon, PlusSmallIcon, ArrowLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';

/**
 * Standard Form Page Layout Wrapper
 */
export const FormPageContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="w-full bg-white rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden h-full flex flex-col relative">
    {children}
  </div>
);

/**
 * Standard Sticky Form Header
 */
export const FormStickyHeader: React.FC<{
  title: string;
  subtitle: string;
  onBack: () => void;
  rightElement?: React.ReactNode;
}> = ({ title, subtitle, onBack, rightElement }) => (
  <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md px-6 md:px-10 py-6 border-b border-gray-50 shrink-0">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2.5 bg-gray-50 text-gray-400 hover:text-[#004A74] hover:bg-[#FED400]/20 rounded-xl transition-all shadow-sm active:scale-90"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div className="flex flex-col">
          <h2 className="text-2xl font-black text-[#004A74]">{title}</h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">{subtitle}</p>
        </div>
      </div>
      {rightElement}
    </div>
  </div>
);

/**
 * Standard Scrollable Form Area
 */
export const FormContentArea: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex-1 overflow-y-auto custom-scrollbar px-6 md:px-10 py-10 pb-32">
    <div className="max-w-6xl mx-auto space-y-8">
      {children}
    </div>
  </div>
);

/**
 * Standard Field Wrapper for Labels and Validation Errors
 */
export const FormField: React.FC<{
  label: React.ReactNode;
  required?: boolean;
  error?: boolean;
  children: React.ReactNode;
}> = ({ label, required, error, children }) => (
  <div className="space-y-1.5 flex flex-col">
    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {error && (
      <p className="text-[10px] text-red-500 font-bold mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
        Required Field
      </p>
    )}
  </div>
);

/**
 * Standard Searchable Dropdown
 */
export const FormDropdown: React.FC<{
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
  isMulti?: boolean;
  onAddMulti?: (val: string) => void;
  onRemoveMulti?: (val: string) => void;
  multiValues?: string[];
  error?: boolean;
}> = ({ 
  value, onChange, options, placeholder, isMulti, onAddMulti, onRemoveMulti, multiValues = [], error 
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (option: string) => {
    if (isMulti && onAddMulti) {
      if (!multiValues.includes(option)) onAddMulti(option);
    } else {
      onChange(option);
    }
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') setIsOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % (filteredOptions.length + (searchTerm && !options.includes(searchTerm) ? 1 : 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const total = filteredOptions.length + (searchTerm && !options.includes(searchTerm) ? 1 : 0);
      setHighlightedIndex(prev => (prev - 1 + total) % total);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[highlightedIndex]);
      } else if (searchTerm) {
        handleSelect(searchTerm.trim());
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <div 
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`group flex items-center justify-between w-full px-4 py-3 bg-gray-50 rounded-xl border ${error ? 'border-red-400' : 'border-gray-200'} hover:border-[#004A74]/40 focus:ring-2 focus:ring-[#004A74]/10 transition-all cursor-pointer shadow-sm outline-none`}
      >
        <div className="flex flex-wrap gap-1.5 items-center overflow-hidden">
          {isMulti && multiValues.length > 0 ? (
            multiValues.map(v => (
              <span key={v} className="px-2 py-0.5 bg-[#004A74] text-white text-[10px] font-bold rounded-md flex items-center gap-1">
                {v}
                <XMarkIcon className="w-3 h-3 hover:text-red-300 transition-colors" onClick={(e) => { e.stopPropagation(); onRemoveMulti?.(v); }} />
              </span>
            ))
          ) : (
            <span className={`text-sm ${value ? 'text-[#004A74] font-bold' : 'text-gray-400'}`}>
              {value || placeholder}
            </span>
          )}
        </div>
        <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-2 bg-gray-50">
            <input 
              autoFocus
              className="w-full px-3 py-2 bg-white rounded-lg text-sm outline-none border border-gray-200 focus:border-[#004A74]/30"
              placeholder="Search or type new..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredOptions.map((opt, idx) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleSelect(opt)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${highlightedIndex === idx ? 'bg-[#FED400]/20 text-[#004A74]' : 'hover:bg-[#FED400]/10 hover:text-[#004A74]'}`}
              >
                {opt}
              </button>
            ))}
            {searchTerm && !options.includes(searchTerm) && (
              <button
                type="button"
                onClick={() => handleSelect(searchTerm)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold text-[#004A74] bg-[#FED400]/10 flex items-center gap-2`}
              >
                <PlusSmallIcon className="w-5 h-5" /> Add: {searchTerm}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};