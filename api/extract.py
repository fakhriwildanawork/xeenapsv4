import io
import re
import requests
import random
from pypdf import PdfReader
from pptx import Presentation
from docx import Document
import openpyxl
from flask import Flask, request, jsonify

app = Flask(__name__)

# Set max content length to 25MB
app.config['MAX_CONTENT_LENGTH'] = 25 * 1024 * 1024

def clean_text(text):
    if not text:
        return ""
    if isinstance(text, bytes):
        text = text.decode('utf-8', errors='ignore')
    if not isinstance(text, str):
        text = str(text)
    
    # Clean weird spacing and extra newlines
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def fetch_with_jina(url):
    """
    Uses Jina Reader (r.jina.ai) to fetch and render the URL.
    This handles JS rendering, bypasses bot protection, and returns clean Markdown.
    """
    jina_url = f"https://r.jina.ai/{url}"
    try:
        # We use a standard requests call because Jina handles the browser work
        headers = {
            "Accept": "application/json",
            "X-With-Generated-Alt": "true" # Optional: gets better descriptions of images
        }
        response = requests.get(jina_url, headers=headers, timeout=30)
        
        if response.status_code == 200:
            json_data = response.json()
            # Jina returns structured data: title, content (markdown), description, etc.
            return {
                "content": json_data.get("data", {}).get("content", ""),
                "title": json_data.get("data", {}).get("title", ""),
                "description": json_data.get("data", {}).get("description", "")
            }
        else:
            print(f"Jina Error: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Jina Fetch Exception: {str(e)}")
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

    # Extract Year
    year_match = re.search(r'\b(19|20)\d{2}\b', text_str[:5000])
    if year_match:
        metadata["year"] = year_match.group(0)

    # Simple Publisher Heuristics
    publishers = ["Elsevier", "Springer", "IEEE", "MDPI", "Nature", "Science", "Wiley", "Taylor & Francis", "ACM", "Frontiers", "Sage", "Medium", "BBC", "CNN", "Wikipedia"]
    for pub in publishers:
        if pub.lower() in text_str[:10000].lower():
            metadata["publisher"] = pub
            break

    return metadata

def process_extracted_text(full_text, title, base_metadata=None):
    text_str = str(full_text)
    
    # 1. Limit total text (200,000 chars) for performance
    limit_total = 200000
    limited_text = text_str[:limit_total]

    # 2. Merge Heuristics
    metadata = extract_metadata_heuristics(limited_text, title)
    if base_metadata:
        for key, value in base_metadata.items():
            if value:
                metadata[key] = value
    
    # 3. Snippet for AI (Groq/Gemini)
    ai_snippet = limited_text[:7500]
    
    # 4. Split text into chunks
    chunk_size = 20000
    chunks = [limited_text[i:i+chunk_size] for i in range(0, len(limited_text), chunk_size)][:10]

    return {
        **metadata,
        "aiSnippet": ai_snippet,
        "chunks": chunks
    }

@app.route('/api/extract', methods=['POST'])
def extract():
    try:
        # HANDLING URL EXTRACTION (Jina Reader Integration)
        if request.is_json:
            data = request.get_json()
            url = data.get('url')
            if not url:
                return jsonify({"status": "error", "message": "No URL provided"}), 400
            
            jina_data = fetch_with_jina(url)
            
            if not jina_data or not jina_data.get("content"):
                return jsonify({
                    "status": "error", 
                    "message": "The website could not be accessed. It might be heavily protected or offline."
                }), 422
            
            full_text = jina_data["content"]
            source_meta = {
                "title": jina_data.get("title") or url,
                "publisher": "" # Jina doesn't return publisher directly, heuristic will handle it
            }
            
            result_data = process_extracted_text(clean_text(full_text), source_meta["title"], source_meta)
            return jsonify({"status": "success", "data": result_data})

        # HANDLING FILE EXTRACTION
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
            return jsonify({"status": "error", "message": "Unsupported file format."}), 400

        if not full_text.strip():
            return jsonify({"status": "error", "message": "Document is empty."}), 422

        result_data = process_extracted_text(clean_text(full_text), file.filename)
        return jsonify({"status": "success", "data": result_data})
        
    except Exception as e:
        return jsonify({"status": "error", "message": f"Server Error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(port=5000)
