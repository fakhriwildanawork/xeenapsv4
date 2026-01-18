
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

/**
 * Memicu setup database di Google Sheets (membuat sheet & header).
 */
export const initializeDatabase = async (): Promise<{ status: string; message: string }> => {
  try {
    if (!GAS_WEB_APP_URL) throw new Error('VITE_GAS_URL is missing.');
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'setupDatabase' }),
    });
    return await response.json();
  } catch (error: any) {
    console.error("Init Database Error:", error);
    return { status: 'error', message: error.toString() };
  }
};

export const fetchLibrary = async (): Promise<LibraryItem[]> => {
  try {
    if (!GAS_WEB_APP_URL) {
      console.warn("GAS_WEB_APP_URL is not configured. Library data cannot be fetched.");
      return [];
    }
    
    const response = await fetch(`${GAS_WEB_APP_URL}?action=getLibrary`);
    
    if (!response.ok) {
      const text = await response.text();
      console.error(`GAS Fetch Error (${response.status}):`, text);
      return [];
    }
    
    const result: GASResponse<LibraryItem[]> = await response.json();
    
    if (result.status === 'error') {
      console.error("GAS Service reported an error:", result.message);
      return [];
    }
    
    return result.data || [];
  } catch (error) {
    console.error("Library Fetch Critical Error (Likely CORS or URL issue):", error);
    return [];
  }
};

export const callAiProxy = async (provider: 'groq' | 'gemini', prompt: string, modelOverride?: string): Promise<string> => {
  try {
    if (!GAS_WEB_APP_URL) throw new Error('GAS_WEB_APP_URL not configured');

    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ 
        action: 'aiProxy', 
        provider, 
        prompt, 
        modelOverride 
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GAS AI Proxy HTTP Error ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    
    if (result && result.status === 'success' && result.data) {
      return result.data;
    }
    
    throw new Error(result?.message || 'AI Proxy failed to return data.');
  } catch (error: any) {
    console.error(`AI Proxy Error Details (${provider}):`, error);
    return '';
  }
};

export const fetchAiConfig = async (): Promise<{ model: string }> => {
  try {
    if (!GAS_WEB_APP_URL) return { model: 'gemini-3-flash-preview' };
    const response = await fetch(`${GAS_WEB_APP_URL}?action=getAiConfig`);
    const result: GASResponse<{ model: string }> = await response.json();
    return result.data || { model: 'gemini-3-flash-preview' };
  } catch (error) {
    return { model: 'gemini-3-flash-preview' };
  }
};

/**
 * Helper to wrap extracted text for AI analysis
 */
const processExtractedText = (extractedText: string, defaultTitle: string = ""): ExtractionResult => {
  const limitTotal = 200000;
  const limitedText = extractedText.substring(0, limitTotal);
  const aiSnippet = limitedText.substring(0, 7500);
  
  const chunkSize = 20000;
  const chunks: string[] = [];
  for (let i = 0; i < limitedText.length; i += chunkSize) {
    if (chunks.length >= 10) break;
    chunks.push(limitedText.substring(i, i + chunkSize));
  }

  return {
    title: defaultTitle,
    fullText: limitedText,
    aiSnippet,
    chunks
  } as ExtractionResult;
};

/**
 * EKSTRAKSI DARI URL (Triple Threat Logic)
 * 1. Jina Reader (Vercel Python)
 * 2. GAS Native Fetch
 * 3. ScrapingAnt (via GAS)
 */
export const extractFromUrl = async (url: string): Promise<ExtractionResult | null> => {
  try {
    const isDriveUrl = url.includes('drive.google.com');

    // DRIVE LINK -> Direct GAS (Special logic for Auth/Conversion)
    if (isDriveUrl) {
      if (!GAS_WEB_APP_URL) throw new Error('VITE_GAS_URL is missing.');

      const gasResponse = await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'extractOnly', url }),
      });

      if (!gasResponse.ok) throw new Error(`GAS Drive Extraction Failed`);
      
      const gasResult = await gasResponse.json();
      if (gasResult.status !== 'success') throw new Error(gasResult.message || 'Drive processing failed.');

      return processExtractedText(gasResult.extractedText || "", gasResult.fileName || "");
    } 

    // REGULAR WEB LINK -> TRIPLE THREAT SEQUENCE
    
    // METHOD 1: JINA (Python API)
    try {
      const jinaResponse = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (jinaResponse.ok) {
        const result = await jinaResponse.json();
        if (result.status === 'success') return result.data as ExtractionResult;
      }
      console.warn("Method 1 (Jina) failed or blocked. Proceeding to Method 2 (GAS Native)...");
    } catch (jinaErr) {
      console.warn("Jina fetch error:", jinaErr);
    }

    // METHOD 2 & 3: GAS NATIVE & SCRAPINGANT (Handled inside GAS extractOnly)
    if (!GAS_WEB_APP_URL) throw new Error('GAS Backend URL not configured for fallback.');

    const fallbackResponse = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'extractOnly', url }),
    });

    if (!fallbackResponse.ok) {
      throw new Error(`Fallback Extraction Failed with status ${fallbackResponse.status}`);
    }

    const fallbackResult = await fallbackResponse.json();
    if (fallbackResult.status === 'success' && fallbackResult.extractedText) {
      return processExtractedText(fallbackResult.extractedText, fallbackResult.fileName || "");
    }

    throw new Error(fallbackResult.message || 'All extraction methods failed.');

  } catch (error: any) {
    console.error('Final Extraction Error:', error);
    throw error;
  }
};

/**
 * MENGIRIM FILE UNTUK EKSTRAKSI SAJA (Vercel Python API).
 */
export const uploadAndStoreFile = async (file: File): Promise<ExtractionResult | null> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/extract', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Extraction Failed: ${errText}`);
    }
    
    const result = await response.json();
    if (result.status === 'success') {
      return result.data as ExtractionResult;
    }
    throw new Error(result.message || 'File processing failed.');

  } catch (error: any) {
    console.error('Extraction Error:', error);
    throw error;
  }
};

/**
 * MENYIMPAN ITEM KE SPREADSHEET (GAS).
 */
export const saveLibraryItem = async (
  item: LibraryItem, 
  fileContent?: { fileName: string; mimeType: string; fileData: string }
): Promise<boolean> => {
  try {
    if (!GAS_WEB_APP_URL) throw new Error('VITE_GAS_URL is missing.');
    
    const payload = { 
      action: 'saveItem', 
      item, 
      file: fileContent 
    };

    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const result: GASResponse<any> = await response.json();
    if (result.status === 'success') {
      Toast.fire({ 
        icon: 'success', 
        title: 'Collection saved successfully',
        background: '#004A74',
        color: '#FFFFFF',
        iconColor: '#FED400'
      });
      return true;
    }
    console.error("Save Error:", result.message);
    return false;
  } catch (error) {
    console.error("Sync Critical Error:", error);
    Toast.fire({ icon: 'error', title: 'Sync failed' });
    return false;
  }
};

export const deleteLibraryItem = async (id: string): Promise<boolean> => {
  try {
    if (!GAS_WEB_APP_URL) throw new Error('VITE_GAS_URL is missing.');
    const response = await fetch(GAS_WEB_APP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'deleteItem', id }),
    });
    const result: GASResponse<any> = await response.json();
    return result.status === 'success';
  } catch (error) {
    console.error("Delete Error:", error);
    return false;
  }
};
