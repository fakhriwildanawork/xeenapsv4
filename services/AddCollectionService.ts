
import { LibraryItem } from "../types";
import { callAiProxy } from "./gasService";

/**
 * AddCollectionService - Metadata Extraction via AI Proxy.
 * FOCUS: Basic metadata, robust citations, keywords, and labels.
 * EXCLUDE: Deep insights (abstract, summary, methodology, etc.)
 */
export const extractMetadataWithAI = async (textSnippet: string): Promise<Partial<LibraryItem>> => {
  try {
    const truncatedSnippet = textSnippet.substring(0, 7500);

    const prompt = `ACT AS AN EXPERT SENIOR ACADEMIC LIBRARIAN. 
    EXTRACT DATA FROM THE PROVIDED PDF TEXT AND RETURN IN RAW JSON FORMAT ONLY.

    SCOPE LIMITATION (CRITICAL):
    - ANALYZE ONLY: title, topic, subTopic, authors, publisher, year, keywords, labels, and all 6 citation fields.
    - DO NOT analyze: researchMethodology, abstract, summary, strength, weakness, unfamiliarTerminology, supportingReferences, videoRecommendation, quickTipsForYou.

    CRITICAL INSTRUCTION FOR ROBUSTNESS:
    1. COMPLETE FIELDS (NO TRUNCATION):
       - "title": Full, official academic title.
       - "authors": List of all full names found.
       - "publisher": MANDATORY. Identify ACCURATELY the complete Publisher Name Fisrt, if publsisher is not found then Identify ACCURATELY the complete Journal Name, and if none of them are found then get more likely string to be catch as a publisher . DO NOT use "Not Specified", "N/A", or "Unknown". Look carefully at the entire document given, THEN ANALYZE AND FIND THE MOST ACCURATE PUBLISHER NAME.
       - "bibAPA", "bibHarvard", "bibChicago": COMPLETE bibliographic entries. Include full titles, full journal names, volume, issue, page ranges, and DOI. NEVER shorten.
    
    2. CONCISE FIELDS:
       - "topic": Exactly 2 words describing the main field.
       - "subTopic": Exactly 2 words describing the specific niche.
       - "keywords": Exactly 5 relevant academic keywords extracted from content.
       - "labels": Exactly 3 thematic labels extracted from content.
       - "year": Accurately identify the exact year of publication from the source. If none of source provide year of publication, return empty

    3. STYLE COMPLIANCE: 
       - inTextAPA: (Author, Year)
       - inTextHarvard: (Author, Year)
       - inTextChicago: (Author Year)

    EXPECTED JSON SCHEMA:
    {
      "title": "Full Academic Title",
      "authors": ["Full Name 1", "Full Name 2"],
      "year": "YYYY",
      "publisher": "Full Journal/Publisher Name",
      "category": "e.g., Original Research",
      "topic": "Two Words",
      "subTopic": "Two Words",
      "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
      "labels": ["label1", "label2", "label3"],
      "inTextAPA": "...",
      "inTextHarvard": "...",
      "inTextChicago": "...",
      "bibAPA": "COMPLETE APA 7th Edition Entry",
      "bibHarvard": "COMPLETE Harvard Entry",
      "bibChicago": "COMPLETE Chicago Entry"
    }

    TEXT SNIPPET TO ANALYZE:
    ${truncatedSnippet}`;

    const response = await callAiProxy('groq', prompt);
    if (!response) return {};
    
    let cleanJson = response.trim();
    if (cleanJson.includes('{')) {
      const start = cleanJson.indexOf('{');
      const end = cleanJson.lastIndexOf('}');
      if (start !== -1 && end !== -1) cleanJson = cleanJson.substring(start, end + 1);
    }

    try {
      const parsed = JSON.parse(cleanJson);
      // Filter out empty values
      return Object.fromEntries(Object.entries(parsed).filter(([_, v]) => v != null && v !== ""));
    } catch (e) {
      console.error('JSON Parse Error:', e);
      return {};
    }
  } catch (error) {
    console.error('Extraction Failed:', error);
    return {};
  }
};
