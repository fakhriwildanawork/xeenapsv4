
import { LibraryItem, GASResponse, ExtractionResult } from '../types';
import { GAS_WEB_APP_URL } from '../constants';
import Swal from 'sweetalert2';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

export const initializeDatabase = async (): Promise<{ status: string; message: string }> => {
  try {
    if (!GAS_WEB_APP_URL) throw new Error('VITE_GAS_URL is missing.');
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'setupDatabase' }),
    });
    return await response.json();
  } catch (error: any) {
    return { status: 'error', message: error.toString() };
  }
};

export const fetchLibrary = async (): Promise<LibraryItem[]> => {
  try {
    if (!GAS_WEB_APP_URL) return [];
    const response = await fetch(`${GAS_WEB_APP_URL}?action=getLibrary`);
    if (!response.ok) return [];
    const result: GASResponse<LibraryItem[]> = await response.json();
    return result.data || [];
  } catch (error) {
    return [];
  }
};

export const callAiProxy = async (provider: 'groq' | 'gemini', prompt: string, modelOverride?: string): Promise<string> => {
  try {
    if (!GAS_WEB_APP_URL) throw new Error('GAS_WEB_APP_URL not configured');
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'aiProxy', provider, prompt, modelOverride }),
    });
    const result = await response.json();
    if (result && result.status === 'success') return result.data;
    throw new Error(result?.message || 'AI Proxy failed.');
  } catch (error: any) {
    return '';
  }
};

const processExtractedText = (extractedText: string, defaultTitle: string = ""): ExtractionResult => {
  if (!extractedText || extractedText.length < 300) {
    throw new Error("Insufficient content extracted.");
  }
  const limitTotal = 200000;
  const limitedText = extractedText.substring(0, limitTotal);
  const aiSnippet = limitedText.substring(0, 7500);
  const chunkSize = 20000;
  const chunks: string[] = [];
  for (let i = 0; i < limitedText.length; i += chunkSize) {
    if (chunks.length >= 10) break;
    chunks.push(limitedText.substring(i, i + chunkSize));
  }
  return { title: defaultTitle, fullText: limitedText, aiSnippet, chunks } as ExtractionResult;
};

export const extractFromUrl = async (url: string, onStageChange?: (stage: 'READING' | 'BYPASS' | 'AI_ANALYSIS') => void): Promise<ExtractionResult | null> => {
  console.info(`[Xeenaps] Starting extraction for: ${url}`);
  try {
    if (url.includes('drive.google.com')) {
      console.info(`[Xeenaps] Detected Google Drive link. Calling GAS...`);
      onStageChange?.('READING');
      const res = await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'extractOnly', url }),
      });
      const data = await res.json();
      if (data.status === 'success') return processExtractedText(data.extractedText, data.fileName);
      throw new Error(data.message || 'Drive extraction failed.');
    }

    // 1. Jina Stage
    console.info(`[Xeenaps] Method 1: Jina Reader Stage...`);
    onStageChange?.('READING');
    try {
      const jinaRes = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      if (jinaRes.status === 200) {
        const result = await jinaRes.json();
        if (result.status === 'success' && result.data?.fullText?.length >= 300) {
          console.info(`[Xeenaps] Method 1 Succeeded.`);
          return result.data as ExtractionResult;
        }
      }
      console.warn(`[Xeenaps] Method 1 failed validation. Falling back...`);
    } catch (e) {
      console.warn(`[Xeenaps] Method 1 exception.`);
    }

    // 2. GAS Stage (Native + ScrapingAnt Bypass)
    console.info(`[Xeenaps] Method 2/3: GAS Bypass Stage...`);
    onStageChange?.('BYPASS');
    if (!GAS_WEB_APP_URL) throw new Error('GAS URL missing.');
    const gasRes = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'extractOnly', url }),
    });
    
    const gasData = await gasRes.json();
    if (gasData.status === 'success' && gasData.extractedText) {
      console.info(`[Xeenaps] Method 2/3 Succeeded via GAS.`);
      return processExtractedText(gasData.extractedText, gasData.fileName);
    }

    throw new Error(gasData.message || 'All extraction methods failed to return content.');
  } catch (error: any) {
    console.error('[Xeenaps] Final Extraction Error:', error.message);
    throw error;
  }
};

export const uploadAndStoreFile = async (file: File): Promise<ExtractionResult | null> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/extract', { method: 'POST', body: formData });
  const result = await response.json();
  if (result.status === 'success') return result.data as ExtractionResult;
  throw new Error(result.message || 'File processing failed.');
};

export const saveLibraryItem = async (item: LibraryItem, fileContent?: any): Promise<boolean> => {
  try {
    const res = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'saveItem', item, file: fileContent }),
    });
    const result = await res.json();
    if (result.status === 'success') {
      Toast.fire({ icon: 'success', title: 'Collection saved', background: '#004A74', color: '#FFFFFF' });
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

export const deleteLibraryItem = async (id: string): Promise<boolean> => {
  const res = await fetch(GAS_WEB_APP_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'deleteItem', id }),
  });
  const result = await res.json();
  return result.status === 'success';
};
