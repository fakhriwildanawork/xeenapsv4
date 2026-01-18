
/**
 * XEENAPS PKM - SECURE BACKEND V24 (CONSOLIDATED & STABLE)
 * Combines V16 File Stability with Advanced Web Extraction (Jina + ScrapingAnt).
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
      } catch (err) {
        extractedText = "Extraction failed: " + err.toString();
      }

      return createJsonResponse({ 
        status: 'success', 
        extractedText: extractedText,
        fileName: fileName
      });
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

function getFileIdFromUrl(url) {
  const match = url.match(/[-\w]{25,}/);
  return match ? match[0] : null;
}

/**
 * Enhanced URL Extraction (V16 Base + Jina + ScrapingAnt)
 */
function handleUrlExtraction(url) {
  const driveId = getFileIdFromUrl(url);
  
  // 1. Google Drive Handler (Stable V16 Logic)
  if (driveId && url.includes('drive.google.com')) {
    try {
      const fileMeta = Drive.Files.get(driveId);
      const mimeType = fileMeta.mimeType;
      const isNative = mimeType.includes('google-apps');
      
      if (isNative) {
        if (mimeType.includes('document')) return DocumentApp.openById(driveId).getBody().getText();
        if (mimeType.includes('spreadsheet')) return SpreadsheetApp.openById(driveId).getSheets().map(s => s.getDataRange().getValues().map(r => r.join(" ")).join("\n")).join("\n");
        if (mimeType.includes('presentation')) return SlidesApp.openById(driveId).getSlides().map(s => s.getShapes().map(sh => { try { return sh.getText().asString(); } catch(e) { return ""; } }).join(" ")).join("\n");
      }

      const blob = DriveApp.getFileById(driveId).getBlob();
      return extractTextContent(blob, mimeType);
    } catch (e) {
      throw new Error("Drive access failed: " + e.message);
    }
  }

  // 2. Web URL Handler - Stage 1: Jina Reader
  const jinaContent = fetchWithJina(url);
  if (jinaContent && jinaContent.length > 500) return jinaContent;

  // 3. Web URL Handler - Stage 2: ScrapingAnt Bypass
  const antKey = getScrapingAntKey();
  if (antKey) {
    try {
      const antUrl = `https://api.scrapingant.com/v2/general?url=${encodeURIComponent(url)}&x-api-key=${antKey}&browser=true&proxy_type=residential`;
      const response = UrlFetchApp.fetch(antUrl, { muteHttpExceptions: true });
      const html = response.getContentText();
      if (response.getResponseCode() === 200 && !isBlocked(html)) {
        return cleanHtml(html);
      }
    } catch (e) {}
  }

  // 4. Web URL Handler - Fallback: Simple Fetch (V16 Logic)
  try {
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    return cleanHtml(response.getContentText());
  } catch (e) {
    throw new Error("Website fetch failed: " + e.message);
  }
}

function fetchWithJina(url) {
  try {
    const response = UrlFetchApp.fetch("https://r.jina.ai/" + url, { muteHttpExceptions: true, headers: { "Accept": "application/json" } });
    if (response.getResponseCode() === 200) {
      const json = JSON.parse(response.getContentText());
      const content = json.data?.content || "";
      if (!isBlocked(content)) return content;
    }
  } catch (e) {}
  return null;
}

function isBlocked(text) {
  if (!text || text.length < 350) return true;
  const blockedKeywords = ["access denied", "cloudflare", "security check", "forbidden", "captcha", "bot detection"];
  const textLower = text.toLowerCase();
  return blockedKeywords.some(keyword => textLower.includes(keyword));
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

/**
 * Ghost Extraction logic (Stable V16)
 */
function extractTextContent(blob, mimeType) {
  if (mimeType.includes('text/') || mimeType.includes('csv')) return blob.getDataAsString();

  let targetMimeType = 'application/vnd.google-apps.document';
  let appType = 'doc';
  
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
    targetMimeType = 'application/vnd.google-apps.spreadsheet';
    appType = 'sheet';
  } else if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    targetMimeType = 'application/vnd.google-apps.presentation';
    appType = 'slide';
  }

  const resource = { name: "Xeenaps_Ghost_" + Utilities.getUuid(), mimeType: targetMimeType };
  let tempFileId = null;
  
  try {
    const tempFile = Drive.Files.create(resource, blob);
    tempFileId = tempFile.id;
    let text = "";

    if (appType === 'doc') {
      text = DocumentApp.openById(tempFileId).getBody().getText();
    } else if (appType === 'sheet') {
      text = SpreadsheetApp.openById(tempFileId).getSheets().map(s => s.getDataRange().getValues().map(r => r.join(" ")).join("\n")).join("\n");
    } else if (appType === 'slide') {
      text = SlidesApp.openById(tempFileId).getSlides().map(s => s.getShapes().map(sh => { try { return sh.getText().asString(); } catch(e) { return ""; } }).join(" ")).join("\n");
    }
    
    Drive.Files.remove(tempFileId); 
    return text;
  } catch (e) {
    if (tempFileId) { try { Drive.Files.remove(tempFileId); } catch(i) {} }
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
    return { status: 'success', message: 'Database initialized.' };
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
  if (!keys || keys.length === 0) return { status: 'error', message: 'No keys.' };
  const config = getProviderModel(provider);
  const model = modelOverride || config.model;
  for (let i = 0; i < keys.length; i++) {
    try {
      let responseText = (provider === 'groq') ? callGroqApi(keys[i], model, prompt) : callGeminiApi(keys[i], model, prompt);
      if (responseText) return { status: 'success', data: responseText };
    } catch (err) {}
  }
  return { status: 'error', message: 'AI failed.' };
}

function callGroqApi(apiKey, model, prompt) {
  const url = "https://api.groq.com/openai/v1/chat/completions";
  const payload = { model: model, messages: [{ role: "system", content: "Academic librarian. JSON." }, { role: "user", content: prompt }], temperature: 0.1, response_format: { type: "json_object" } };
  const res = UrlFetchApp.fetch(url, { method: "post", contentType: "application/json", headers: { "Authorization": "Bearer " + apiKey }, payload: JSON.stringify(payload), muteHttpExceptions: true });
  return JSON.parse(res.getContentText()).choices[0].message.content;
}

function callGeminiApi(apiKey, model, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const payload = { contents: [{ parts: [{ text: prompt }] }] };
  const res = UrlFetchApp.fetch(url, { method: "post", contentType: "application/json", payload: JSON.stringify(payload), muteHttpExceptions: true });
  return JSON.parse(res.getContentText()).candidates[0].content.parts[0].text;
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
      if (['tags', 'authors', 'keywords', 'labels'].includes(h)) { try { val = JSON.parse(row[i] || '[]'); } catch(e) { val = []; } }
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
