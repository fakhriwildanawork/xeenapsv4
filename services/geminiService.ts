
import { GoogleGenAI } from "@google/genai";

/**
 * Gemini Service using @google/genai SDK for PKM item processing.
 */

// Fix: Direct SDK implementation for summarization using gemini-3-flash-preview as recommended
export const summarizeContent = async (title: string, content: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Summarize this PKM item titled "${title}". 
    Content: ${content.substring(0, 5000)}
    Provide a concise summary (max 2 sentences). Output only text.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    return response.text || 'No summary generated.';
  } catch (error) {
    console.error("Summarization error:", error);
    return 'AI summary unavailable at the moment.';
  }
};

// Fix: Direct SDK implementation for tag suggestion using gemini-3-flash-preview
export const suggestTags = async (title: string, content: string): Promise<string[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Suggest exactly 5 relevant short tags for: "${title}" and "${content.substring(0, 1000)}".
    Output only tags separated by commas.`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    const result = response.text;
    if (!result) return [];
    return result.split(',').map(tag => tag.trim().toLowerCase()).filter(t => t.length > 0);
  } catch (error) {
    console.error("Tag suggestion error:", error);
    return [];
  }
};
