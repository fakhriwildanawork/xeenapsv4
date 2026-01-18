import React, { useState, useEffect, useMemo } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface SmartSearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  phrases?: string[];
  className?: string;
}

/**
 * Standard Xeenaps Smart Search Box
 * Features:
 * 1. Continuous typing animation for placeholder
 * 2. High contrast border
 * 3. Primary color search icon
 * 4. Responsive design
 */
export const SmartSearchBox: React.FC<SmartSearchBoxProps> = ({ 
  value, 
  onChange, 
  phrases: customPhrases,
  className = "w-full lg:max-w-md"
}) => {
  const [placeholderText, setPlaceholderText] = useState('');
  
  const defaultPhrases = useMemo(() => [
    "Search by Title...",
    "Search by Author(s)...",
    "Search by Publisher...",
    "Search by Topic...",
    "Search by Anything Else..."
  ], []);

  const phrases = customPhrases || defaultPhrases;

  useEffect(() => {
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timeoutId: number;

    const type = () => {
      const currentPhrase = phrases[phraseIndex];
      
      if (isDeleting) {
        setPlaceholderText(currentPhrase.substring(0, charIndex - 1));
        charIndex--;
      } else {
        setPlaceholderText(currentPhrase.substring(0, charIndex + 1));
        charIndex++;
      }

      let typeSpeed = isDeleting ? 50 : 100;

      if (!isDeleting && charIndex === currentPhrase.length) {
        isDeleting = true;
        typeSpeed = 2000; // Pause at end of phrase
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        typeSpeed = 500; // Pause before starting new phrase
      }

      timeoutId = window.setTimeout(type, typeSpeed);
    };

    timeoutId = window.setTimeout(type, 500);
    return () => clearTimeout(timeoutId);
  }, [phrases]);

  return (
    <div className={`relative group ${className}`}>
      <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#004A74] group-focus-within:text-[#004A74] transition-colors" />
      <input 
        type="text"
        placeholder={placeholderText}
        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-2xl focus:ring-2 focus:ring-[#004A74]/10 focus:border-[#004A74] outline-none transition-all shadow-sm text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};