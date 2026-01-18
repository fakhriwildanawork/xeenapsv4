
import io
import re
import requests
from pypdf import PdfReader
from pptx import Presentation
from docx import Document
import openpyxl
from flask import Flask, request, jsonify

app = Flask(__name__)

# Set max content length to 25MB
app.config['MAX_CONTENT_LENGTH'] = 25 * 1024 * 1024

def is_blocked_content(text):
    """Detects if the extracted text is actually an 'Access Denied' or protection page."""
    if not text or len(text) < 300: # Usually error pages are short
        return True
    
    blocked_keywords = [
        "access denied", "cloudflare", "security check", "forbidden", 
        "please enable cookies", "checking your browser", "robot",
        "captcha", "403 forbidden", "403 error", "bot detection",
        "not authorized", "limit reached", "Taylor & Francis Online: Access Denied",
        "verify you are a human", "wait a moment", "standard terms and conditions"
    ]
    
    text_lower = text.lower()
    for keyword in blocked_keywords:
        if keyword.lower() in text_lower:
            return True
    return False

def clean_text(text):
    if not text:
        return ""
    if isinstance(text, bytes):
        text = text.decode('utf-8', errors='ignore')
    if not isinstance(text, str):
        text = str(text)
    
    # Remove script and style tags
    text = re.sub(r'<script\b[^>]*>([\s\S]*?)</script>', '', text, flags=re.I)
    text = re.sub(r'<style\b[^>]*>([\s\S]*?)</style>', '', text, flags=re.I)
    # Remove HTML tags
    text = re.sub(r'<[^>]*>', ' ', text)
    
    # Clean weird spacing and extra newlines
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def fetch_with_jina(url):
    """Method 1: Jina Reader for clean Markdown (No API Key)."""
    jina_url = f"https://r.jina.ai/{url}"
    try:
        headers = {
            "Accept": "application/json"
        }
        response = requests.get(jina_url, headers=headers, timeout=15)
        if response.status_code == 200:
            json_data = response.json()
            data = json_data.get("data", {})
            content = data.get("content", "")
            
            # CRITICAL: Verify if content is actually blocked
            if is_blocked_content(content):
                print(f"Jina returned blocked content for {url}")
                return None

            if content:
                return {
                    "content": content,
                    "title": data.get("title", ""),
                    "description": data.get("description", "")
                }
    except Exception as e:
        print(f"Jina error for {url}: {str(e)}")
    return None

def extract_metadata_heuristics(full_text, filename_or_title):
    text_str = str(full_text)
    metadata = {
        "title": filename_or_title.rsplit('.', 1)[0].replace("_", " ") if '.' in filename_or_title else filename_or_title,
        "authors": [],
        "year": "",
        "publisher": "",
        "keywords": [],
        "category": "Original Research",
        "type": "Literature"
    }

    year_match = re.search(r'\b(19|20)\d{2}\b', text_str[:5000])
    if year_match:
        metadata["year"] = year_match.group(0)

    publishers = ["Elsevier", "Springer", "IEEE", "MDPI", "Nature", "Science", "Wiley", "Taylor & Francis", "ACM", "Frontiers", "Sage", "Medium", "BBC", "CNN", "Wikipedia"]
    for pub in publishers:
        if pub.lower() in text_str[:10000].lower():
            metadata["publisher"] = pub
            break

    return metadata

def process_extracted_text(full_text, title, base_metadata=None):
    # Sanitize and limit
    cleaned = clean_text(full_text)
    limit_total = 200000
    limited_text = cleaned[:limit_total]

    metadata = extract_metadata_heuristics(limited_text, title)
    if base_metadata:
        for key, value in base_metadata.items():
            if value: metadata[key] = value
    
    ai_snippet = limited_text[:7500]
    chunk_size = 20000
    chunks = [limited_text[i:i+chunk_size] for i in range(0, len(limited_text), chunk_size)][:10]

    return {
        **metadata,
        "aiSnippet": ai_snippet,
        "chunks": chunks,
        "fullText": limited_text
    }

@app.route('/api/extract', methods=['POST'])
def extract():
    try:
        # URL EXTRACTION
        if request.is_json:
            data = request.get_json()
            url = data.get('url', '').strip()
            if not url:
                return jsonify({"status": "error", "message": "No URL provided"}), 400
            
            # Step 1: Jina Free
            extracted_data = fetch_with_jina(url)
            
            if not extracted_data or not extracted_data.get("content"):
                # Return 422 to signal the frontend to try the GAS/ScrapingAnt fallback
                return jsonify({
                    "status": "error", 
                    "message": "Content is protected or blocked by security."
                }), 422
            
            result_data = process_extracted_text(
                extracted_data["content"], 
                extracted_data.get("title") or url
            )
            return jsonify({"status": "success", "data": result_data})

        # FILE EXTRACTION
        if 'file' not in request.files:
            return jsonify({"status": "error", "message": "No file part"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"status": "error", "message": "No file selected"}), 400

        filename_lower = file.filename.lower()
        file_bytes = file.read()
        f = io.BytesIO(file_bytes)
        full_text = ""

        if filename_lower.endswith('.pdf'):
            reader = PdfReader(f)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text: full_text += page_text + "\n"
        elif filename_lower.endswith('.docx'):
            doc = Document(f)
            full_text = "\n".join([para.text for para in doc.paragraphs])
        elif filename_lower.endswith('.pptx'):
            prs = Presentation(f)
            for slide in prs.slides:
                for shape in slide.shapes:
                    if hasattr(shape, "text") and shape.text: full_text += shape.text + "\n"
        elif filename_lower.endswith('.xlsx'):
            wb = openpyxl.load_workbook(f, data_only=True)
            for sheet in wb.worksheets:
                for row in sheet.iter_rows(values_only=True):
                    full_text += " ".join([str(cell) for cell in row if cell is not None]) + "\n"
        elif filename_lower.endswith(('.txt', '.md', '.csv')):
            full_text = file_bytes.decode('utf-8', errors='ignore')
        else:
            return jsonify({"status": "error", "message": f"Format {filename_lower} is not supported yet."}), 400

        if not full_text.strip():
            return jsonify({"status": "error", "message": "The file seems to be empty or contains only images/scans."}), 422

        result_data = process_extracted_text(full_text, file.filename)
        return jsonify({"status": "success", "data": result_data})
        
    except Exception as e:
        print(f"Main extraction error: {str(e)}")
        return jsonify({"status": "error", "message": f"Extraction Server Error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(port=5000)
