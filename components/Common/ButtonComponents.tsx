import React from 'react';

interface StandardQuickAccessBarProps {
  isVisible: boolean;
  selectedCount: number;
  children: React.ReactNode;
}

/**
 * Standard Xeenaps Quick Access Bar
 * Context-aware container that appears when items are selected.
 */
export const StandardQuickAccessBar: React.FC<StandardQuickAccessBarProps> = ({ 
  isVisible, 
  selectedCount, 
  children 
}) => (
  <div className={`flex items-center gap-2 transition-all duration-300 overflow-hidden shrink-0 ${
    isVisible ? 'h-10 opacity-100 mb-2' : 'h-0 opacity-0 mb-0'
  }`}>
    {children}
    <span className="ml-2 text-xs font-bold text-gray-400">{selectedCount} Selected</span>
  </div>
);

interface StandardQuickActionButtonProps {
  onClick: () => void;
  variant?: 'danger' | 'primary' | 'warning' | 'default';
  children: React.ReactNode;
  className?: string;
}

/**
 * Standard Xeenaps Quick Access Action Button
 * Features: High contrast borders, variant-specific hover states, and active-state scaling.
 */
export const StandardQuickActionButton: React.FC<StandardQuickActionButtonProps> = ({ 
  onClick, 
  variant = 'default', 
  children,
  className = ""
}) => {
  const variantStyles = {
    danger: 'text-red-500 hover:bg-red-50 hover:border-red-100',
    primary: 'text-[#004A74] hover:bg-gray-50 hover:border-[#004A74]/20',
    warning: 'text-[#FED400] hover:bg-yellow-50 hover:border-[#FED400]/20',
    default: 'text-gray-500 hover:bg-gray-50 hover:border-gray-200'
  };

  return (
    <button 
      onClick={onClick}
      className={`p-2.5 bg-white border border-gray-100 rounded-xl transition-all shadow-sm transform active:scale-90 ${variantStyles[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

interface StandardPrimaryButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Standard Xeenaps Primary Action Button
 * Used for main system actions like "Add Collection".
 */
export const StandardPrimaryButton: React.FC<StandardPrimaryButtonProps> = ({ 
  onClick, 
  children, 
  icon,
  className = "" 
}) => (
  <button 
    onClick={onClick}
    className={`w-full lg:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#004A74] text-white rounded-2xl font-bold hover:shadow-lg hover:bg-[#003859] transition-all transform active:scale-95 ${className}`}
  >
    {icon}
    {children}
  </button>
);

interface StandardFilterButtonProps {
  onClick: () => void;
  isActive: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Standard Xeenaps Filter/Tab Button
 * Features a toggle state using the brand's secondary color (Yellow).
 */
export const StandardFilterButton: React.FC<StandardFilterButtonProps> = ({ 
  onClick, 
  isActive, 
  children,
  className = ""
}) => (
  <button
    onClick={onClick}
    className={`px-6 py-2 rounded-full text-xs font-bold transition-all border whitespace-nowrap ${
      isActive 
        ? 'bg-[#FED400] border-[#FED400] text-[#004A74] shadow-md' 
        : 'bg-white border-gray-100 text-gray-400 hover:border-[#FED400] hover:text-[#004A74]'
    } ${className}`}
  >
    {children}
  </button>
);
