
import React from 'react';
import { 
  BookOpenIcon, 
  LinkIcon, 
  DocumentTextIcon, 
  VideoCameraIcon, 
  PencilIcon 
} from '@heroicons/react/24/outline';
import { SourceType } from './types';

export const COLORS = {
  PRIMARY: '#004A74',
  SECONDARY: '#FED400',
  BACKGROUND: '#FFFFFF',
};

export const SOURCE_ICONS: Record<SourceType, React.ReactNode> = {
  [SourceType.LINK]: <LinkIcon className="w-5 h-5" />,
  [SourceType.FILE]: <DocumentTextIcon className="w-5 h-5" />,
  [SourceType.NOTE]: <PencilIcon className="w-5 h-5" />,
  [SourceType.BOOK]: <BookOpenIcon className="w-5 h-5" />,
  [SourceType.VIDEO]: <VideoCameraIcon className="w-5 h-5" />,
};

/**
 * URL Web App Google Apps Script.
 * Menggunakan import.meta.env (standar Vite) atau process.env sebagai fallback.
 */
// @ts-ignore
const getGasUrl = (): string => {
  try {
    // @ts-ignore
    return (import.meta.env?.VITE_GAS_URL) || (process.env?.VITE_GAS_URL) || '';
  } catch (e) {
    return '';
  }
};

export const GAS_WEB_APP_URL = getGasUrl();
