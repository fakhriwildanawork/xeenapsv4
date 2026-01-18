
export enum SourceType {
  LINK = 'LINK',
  FILE = 'FILE',
  NOTE = 'NOTE',
  BOOK = 'BOOK',
  VIDEO = 'VIDEO'
}

export enum FileFormat {
  PDF = 'PDF',
  DOCX = 'DOCX',
  MD = 'MD',
  MP4 = 'MP4',
  URL = 'URL',
  EPUB = 'EPUB',
  PPTX = 'PPTX',
  TXT = 'TXT',
  XLSX = 'XLSX',
  CSV = 'CSV',
  DOC = 'DOC',
  XLS = 'XLS',
  PPT = 'PPT'
}

export enum LibraryType {
  LITERATURE = 'Literature',
  TASK = 'Task',
  PERSONAL = 'Personal',
  OTHER = 'Other'
}

export interface LibraryItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  
  // Basic Fields
  title: string;
  type: LibraryType;
  category: string;
  topic: string;
  subTopic: string;
  author: string; 
  authors: string[];
  publisher: string;
  year: string;
  
  // Collection Info
  addMethod: 'LINK' | 'FILE';
  source: SourceType;
  format: FileFormat;
  url?: string;
  fileId?: string;
  
  // Tags & Labels
  keywords: string[];
  labels: string[];
  tags: string[];
  
  // Academic Citations (Expanded to 6 specific fields)
  inTextAPA?: string;
  inTextHarvard?: string;
  inTextChicago?: string;
  bibAPA?: string;
  bibHarvard?: string;
  bibChicago?: string;
  
  // Deep Insights
  researchMethodology?: string;
  abstract?: string;
  summary?: string;
  strength?: string;             // Numbered List
  weakness?: string;             // Numbered List
  unfamiliarTerminology?: string; // Numbered List
  supportingReferences?: string; // Numbered List
  videoRecommendation?: string;  // YouTube Embed ID
  quickTipsForYou?: string;      // Narrative Paragraph
  
  // Large Data Handling (Chunks)
  extractedInfo1?: string;
  extractedInfo2?: string;
  extractedInfo3?: string;
  extractedInfo4?: string;
  extractedInfo5?: string;
  extractedInfo6?: string;
  extractedInfo7?: string;
  extractedInfo8?: string;
  extractedInfo9?: string;
  extractedInfo10?: string;
  
  isFavorite?: boolean;
  isBookmarked?: boolean;
}

export interface GASResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

export interface ExtractionResult extends Partial<LibraryItem> {
  fullText?: string;
  chunks?: string[];
  aiSnippet?: string;
}

export type ViewState = 'LIBRARY' | 'ADD_ITEM' | 'SETTINGS' | 'AI_CHAT';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}
