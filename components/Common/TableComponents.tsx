
import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

/**
 * Standard Xeenaps Table Container
 * Features: Soft seamless shadow, rounded corners, and overflow control.
 */
export const StandardTableContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative flex-1 bg-white border border-gray-100/50 rounded-[2rem] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] flex flex-col min-h-0">
    {children}
  </div>
);

/**
 * Standard Xeenaps Table Scroll Wrapper
 */
export const StandardTableWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
    <table className="w-full text-left border-separate border-spacing-0 min-w-[1200px]">
      {children}
    </table>
  </div>
);

/**
 * Standard Xeenaps Table Header Cell
 * Updated: Center-aligned content with justify-center and support for frozen column styles.
 */
export const StandardTh: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  isActiveSort?: boolean;
  className?: string;
  width?: string;
}> = ({ children, onClick, isActiveSort, className = "", width }) => (
  <th 
    onClick={onClick}
    className={`px-4 py-4 text-[10px] font-black uppercase tracking-widest text-[#004A74] transition-colors ${
      onClick ? 'cursor-pointer group/th select-none' : ''
    } ${!isActiveSort ? 'bg-gray-50' : ''} ${className}`}
    style={{
      ...width ? { width, minWidth: width } : {},
      ...(isActiveSort ? { 
        backgroundColor: '#FFFFFF', 
        backgroundImage: 'linear-gradient(rgba(0, 74, 116, 0.15), rgba(0, 74, 116, 0.15))',
        backgroundBlendMode: 'normal'
      } : {})
    }}
  >
    <div className="flex items-center justify-center gap-2">
      {children}
    </div>
  </th>
);

/**
 * Standard Xeenaps Table Row
 */
export const StandardTr: React.FC<{ 
  children: React.ReactNode; 
  className?: string; 
  onClick?: () => void 
}> = ({ children, className = "", onClick }) => (
  <tr 
    onClick={onClick}
    className={`hover:bg-[#004A74]/5 hover:scale-[1.002] transition-all duration-300 group border-b border-gray-50 last:border-0 origin-center ${className}`}
  >
    {children}
  </tr>
);

/**
 * Standard Xeenaps Table Data Cell
 */
export const StandardTd: React.FC<{ children: React.ReactNode; isActiveSort?: boolean; className?: string }> = ({ 
  children, 
  isActiveSort, 
  className = "" 
}) => (
  <td className={`px-4 py-4 text-sm transition-colors ${className}`}>
    {children}
  </td>
);

/**
 * Standard Xeenaps Responsive Grid Container for Cards
 * Implements the 1x20 (mobile), 2x10 (tablet), 4x5 (small desktop) pattern.
 */
export const StandardGridContainer: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
    {children}
  </div>
);

/**
 * Standard Xeenaps Item Card for Grid View
 */
export const StandardItemCard: React.FC<{
  isSelected?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}> = ({ isSelected, onClick, children, className = "" }) => (
  <div 
    onClick={onClick}
    className={`relative flex flex-col p-5 bg-white border rounded-3xl transition-all ${
      isSelected 
        ? 'border-[#004A74] shadow-md bg-[#004A74]/5 scale-[0.98]' 
        : 'border-gray-100 shadow-sm active:scale-[0.98]'
    } ${className}`}
  >
    {children}
  </div>
);

/**
 * Standard Xeenaps Table Pagination/Footer
 */
export const StandardTableFooter: React.FC<{
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}> = ({ totalItems, currentPage, itemsPerPage, totalPages, onPageChange }) => {
  const start = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between shrink-0">
      <p className="text-xs text-gray-500 font-medium">
        Showing <span className="font-bold">{start}</span> to <span className="font-bold">{end}</span> of <span className="font-bold">{totalItems}</span> items
      </p>
      <div className="flex items-center gap-1">
        <button 
          disabled={currentPage === 1} 
          onClick={() => onPageChange(currentPage - 1)} 
          className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-30 transition-all"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        <div className="flex gap-1">
          {[...Array(totalPages)].map((_, i) => (
            <button 
              key={i} 
              onClick={() => onPageChange(i + 1)} 
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                currentPage === i + 1 
                  ? 'bg-[#004A74] text-white shadow-sm' 
                  : 'bg-white border border-gray-200 text-gray-400 hover:border-[#004A74] hover:text-[#004A74]'
              }`}
            >
              {i + 1}
            </button>
          )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
        </div>
        <button 
          disabled={currentPage === totalPages || totalPages === 0} 
          onClick={() => onPageChange(currentPage + 1)} 
          className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-30 transition-all"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

/**
 * Standard Xeenaps Checkbox
 */
export const StandardCheckbox: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input 
    type="checkbox" 
    {...props}
    className={`w-4 h-4 rounded border-gray-300 text-[#004A74] focus:ring-[#004A74] accent-[#004A74] cursor-pointer ${props.className || ''}`} 
  />
);
