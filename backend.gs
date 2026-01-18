
/**
 * XEENAPS PKM - SECURE BACKEND V20
 * Strict Cascading Extraction: Native GAS -> ScrapingAnt.
 */

const CONFIG = {
  FOLDERS: {
    MAIN_LIBRARY: '1WG5W6KHHLhKVK-eCq1bIQYif0ZoSxh9t'
  },
  SPREADSHEETS: {
    LIBRARY: '1NSofMlK1eENfucu2_aF-A3JRwAwTXi7QzTsuPGyFk8w',
    KEYS: '1QRzqKe42ck2HhkA-_yAGS-UHppp96go3s5oJmlrwpc0',
    AI_CONFIG: '1RVYM2-U5LRb8S8JElRSEv2ICHdlOp9pnulcAM8Nd44s'
  },
  SCHEMAS: {
    LIBRARY: [
      'id', 'title', 'type', 'category', 'topic', 'subTopic', 'author', 'authors', 'publisher', 'year', 
      'source', 'format', 'url', 'fileId', 'tags', 'createdAt', 'updatedAt',
      'inTextAPA', 'inTextHarvard', 'inTextChicago', 'bibAPA', 'bibHarvard', 'bibChicago',
      'researchMethodology', 'abstract', 'summary', 
      'strength', 'weakness', 'unfamiliarTerminology', 'supportingReferences', 
      'videoRecommendation', 'quickTipsForYou',
      'extractedInfo1', 'extractedInfo2', 'extractedInfo3', 'extractedInfo4', 'extractedInfo5',
      'extractedInfo6', 'extractedInfo7', 'extractedInfo8', 'extractedInfo9', 'extractedInfo10'
    ]
  }
};

function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === 'getLibrary') return createJsonResponse({ status: 'success', data: getAllItems(CONFIG.SPREADSHEETS.LIBRARY, "Collections") });
    if (action === 'getAiConfig') return createJsonResponse({ status: 'success', data: getProviderModel('GEMINI') });
    return createJsonResponse({ status: 'error', message: 'Invalid action: ' + action });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch(e) {
    return createJsonResponse({ status: 'error', message: 'Malformed JSON request' });
  }
  
  const action = body.action;
  
  try {
    if (action === 'setupDatabase') return createJsonResponse(setupDatabase());
    
    if (action === 'saveItem') {
      const item = body.item;
      if (body.file && body.file.fileData) {
        const folder = DriveApp.getFolderById(CONFIG.FOLDERS.MAIN_LIBRARY);
        const mimeType = body.file.mimeType || 'application/octet-stream';
        const blob = Utilities.newBlob(Utilities.base64Decode(body.file.fileData), mimeType, body.file.fileName);
        const file = folder.createFile(blob);
        item.fileId = file.getId();
      }
      saveToSheet(CONFIG.SPREADSHEETS.LIBRARY, "Collections", item);
      return createJsonResponse({ status: 'success' });
    }
    
    if (action === 'deleteItem') {
      deleteFromSheet(CONFIG.SPREADSHEETS.LIBRARY, "Collections", body.id);
      return createJsonResponse({ status: 'success' });
    }
    
    if (action === 'extractOnly') {
      let extractedText = "";
      let fileName = body.fileName || "Extracted Content";
      try {
        if (body.url) {
          extractedText = handleUrlExtraction(body.url);
        } else if (body.fileData) {
          const mimeType = body.mimeType || 'application/octet-stream';
          const blob = Utilities.newBlob(Utilities.base64Decode(body.fileData), mimeType, fileName);
          extractedText = extractTextContent(blob, mimeType);
        }
        return createJsonResponse({ status: 'success', extractedText: extractedText, fileName: fileName });
      } catch (err) {
        return createJsonResponse({ status: 'error', message: err.message });
      }
    }
    
    if (action === 'aiProxy') {
      const { provider, prompt, modelOverride } = body;
      const result = handleAiRequest(provider, prompt, modelOverride);
      return createJsonResponse(result);
    }
    return createJsonResponse({ status: 'error', message: 'Invalid action: ' + action });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

function isBlocked(text) {
  if (!text || text.length < 350) return true; // Stricter length check
  const blockedKeywords = [
    "access denied", "cloudflare", "security check", "forbidden", 
    "please enable cookies", "checking your browser", "robot",
    "captcha", "403 forbidden", "403 error", "bot detection",
    "not authorized", "limit reached", "Taylor & Francis Online: Access Denied",
    "standard terms and conditions", "wait a moment", "verify you are a human",
    "one more step", "browser security"
  ];
  const textLower = text.toLowerCase();
  return blockedKeywords.some(keyword => textLower.includes(keyword.toLowerCase()));
}

function handleUrlExtraction(url) {
  const driveId = getFileIdFromUrl(url);
  if (driveId && url.includes('drive.google.com')) {
    try {
      const fileMeta = Drive.Files.get(driveId);
      const mimeType = fileMeta.mimeType;
      if (mimeType.includes('google-apps')) {
        if (mimeType.includes('document')) return DocumentApp.openById(driveId).getBody().getText();
        if (mimeType.includes('spreadsheet')) return SpreadsheetApp.openById(driveId).getSheets().map(s => s.getDataRange().getValues().map(r => r.join(" ")).join("\n")).join("\n");
      }
      return extractTextContent(DriveApp.getFileById(driveId).getBlob(), mimeType);
    } catch (e) { throw new Error("Drive access denied: " + e.message); }
  }

  let webText = "";
  let needsScrapingAnt = false;

  // 1. NATIVE GAS FETCH
  try {
    const response = UrlFetchApp.fetch(url, { 
      muteHttpExceptions: true,
      headers: { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.google.com/"
      }
    });
    
    const code = response.getResponseCode();
    const content = response.getContentText();
    
    if (code !== 200 || isBlocked(content)) {
      needsScrapingAnt = true;
    } else {
      webText = cleanHtml(content);
      if (webText.length < 300) needsScrapingAnt = true; // Fallback if cleaned text is too short
    }
  } catch (e) { needsScrapingAnt = true; }

  // 2. SCRAPINGANT FALLBACK
  if (needsScrapingAnt) {
    const antKey = getScrapingAntKey();
    if (!antKey) throw new Error("PROTECTED: ScrapingAnt key missing.");
    
    try {
      const antUrl = `https://api.scrapingant.com/v2/general?url=${encodeURIComponent(url)}&x-api-key=${antKey}&browser=true&proxy_type=residential`;
      const antResponse = UrlFetchApp.fetch(antUrl, { muteHttpExceptions: true });
      if (antResponse.getResponseCode() === 200) {
        const antHtml = antResponse.getContentText();
        if (isBlocked(antHtml)) throw new Error("BYPASS_FAILED: Content still blocked after proxy.");
        webText = cleanHtml(antHtml);
        if (webText.length < 300) throw new Error("BYPASS_FAILED: Extracted text insufficient.");
      } else {
        throw new Error("BYPASS_FAILED: HTTP " + antResponse.getResponseCode());
      }
    } catch (antErr) { 
      throw new Error(antErr.message || "Final bypass method failed.");
    }
  }

  return webText;
}

function cleanHtml(html) {
  return html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
             .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")
             .replace(/<[^>]*>/g, " ")
             .replace(/\s+/g, " ")
             .trim();
}

function getScrapingAntKey() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.KEYS);
    const sheet = ss.getSheetByName("Scraping");
    return sheet ? sheet.getRange("A1").getValue().toString().trim() : null;
  } catch (e) { return null; }
}

function getFileIdFromUrl(url) {
  const match = url.match(/[-\w]{25,}/);
  return match ? match[0] : null;
}

function extractTextContent(blob, mimeType) {
  if (mimeType.includes('text/') || mimeType.includes('csv')) return blob.getDataAsString();
  const resource = { name: "Xeenaps_Temp_" + blob.getName(), mimeType: 'application/vnd.google-apps.document' };
  let tempFileId = null;
  try {
    const tempFile = Drive.Files.create(resource, blob);
    tempFileId = tempFile.id;
    const text = DocumentApp.openById(tempFileId).getBody().getText();
    Drive.Files.remove(tempFileId);
    return text;
  } catch (e) {
    if (tempFileId) try { Drive.Files.remove(tempFileId); } catch(i) {}
    throw new Error("Conversion failed: " + e.message);
  }
}

function setupDatabase() {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.LIBRARY);
    let sheet = ss.getSheetByName("Collections");
    if (!sheet) sheet = ss.insertSheet("Collections");
    const headers = CONFIG.SCHEMAS.LIBRARY;
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f3f3");
    sheet.setFrozenRows(1);
    return { status: 'success', message: 'Database initialized successfully.' };
  } catch (err) { return { status: 'error', message: err.toString() }; }
}

function getProviderModel(providerName) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.AI_CONFIG);
    const sheet = ss.getSheetByName('AI');
    if (!sheet) return { model: getDefaultModel(providerName) };
    const data = sheet.getDataRange().getValues();
    for (let i = 0; i < data.length; i++) {
      if (data[i][0] && data[i][0].toString().toUpperCase() === providerName.toUpperCase()) {
        return { model: data[i][1] ? data[i][1].trim() : getDefaultModel(providerName) };
      }
    }
  } catch (e) {}
  return { model: getDefaultModel(providerName) };
}

function getDefaultModel(provider) {
  return provider.toUpperCase() === 'GEMINI' ? 'gemini-3-flash-preview' : 'meta-llama/llama-4-scout-17b-16e-instruct';
}

function handleAiRequest(provider, prompt, modelOverride) {
  const keys = (provider === 'groq') ? getKeysFromSheet('Groq', 2) : getKeysFromSheet('ApiKeys', 1);
  if (!keys || keys.length === 0) return { status: 'error', message: 'No active API keys found.' };
  const config = getProviderModel(provider);
  const model = modelOverride || config.model;
  let lastError = '';
  for (let i = 0; i < keys.length; i++) {
    try {
      let responseText = (provider === 'groq') ? callGroqApi(keys[i], model, prompt) : callGeminiApi(keys[i], model, prompt);
      if (responseText) return { status: 'success', data: responseText };
    } catch (err) { lastError = err.toString(); }
  }
  return { status: 'error', message: 'AI failed: ' + lastError };
}

function callGroqApi(apiKey, model, prompt) {
  const url = "https://api.groq.com/openai/v1/chat/completions";
  const payload = { model: model, messages: [{ role: "system", content: "Academic librarian. RAW JSON ONLY." }, { role: "user", content: prompt }], temperature: 0.1, response_format: { type: "json_object" } };
  const res = UrlFetchApp.fetch(url, { method: "post", contentType: "application/json", headers: { "Authorization": "Bearer " + apiKey }, payload: JSON.stringify(payload), muteHttpExceptions: true });
  const json = JSON.parse(res.getContentText());
  if (json.error) throw new Error(json.error.message);
  return json.choices[0].message.content;
}

function callGeminiApi(apiKey, model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const payload = { contents: [{ parts: [{ text: prompt }] }] };
  const res = UrlFetchApp.fetch(url, { method: "post", contentType: "application/json", payload: JSON.stringify(payload), muteHttpExceptions: true });
  const json = JSON.parse(res.getContentText());
  if (json.error) throw new Error(json.error.message);
  return json.candidates[0].content.parts[0].text;
}

function getKeysFromSheet(sheetName, colIndex) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEETS.KEYS);
    const sheet = ss.getSheetByName(sheetName);
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];
    return sheet.getRange(2, colIndex, lastRow - 1, 1).getValues().map(r => r[0]).filter(k => k);
  } catch (e) { return []; }
}

function getAllItems(ssId, sheetName) {
  const ss = SpreadsheetApp.openById(ssId);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = values[0];
  return values.slice(1).map(row => {
    let item = {};
    headers.forEach((h, i) => {
      let val = row[i];
      if (['tags', 'authors', 'keywords', 'labels'].includes(h)) {
        try { val = JSON.parse(row[i] || '[]'); } catch(e) { val = []; }
      }
      item[h] = val;
    });
    return item;
  });
}

function saveToSheet(ssId, sheetName, item) {
  const ss = SpreadsheetApp.openById(ssId);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) { setupDatabase(); sheet = ss.getSheetByName(sheetName); }
  const headers = CONFIG.SCHEMAS.LIBRARY;
  const rowData = headers.map(h => {
    const val = item[h];
    return (Array.isArray(val) || (typeof val === 'object' && val !== null)) ? JSON.stringify(val) : (val || '');
  });
  sheet.appendRow(rowData);
}

function deleteFromSheet(ssId, sheetName, id) {
  const ss = SpreadsheetApp.openById(ssId);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) { sheet.deleteRow(i + 1); break; }
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
