import io
import re
import trafilatura
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
    
    # 1. Limit total text (200,000 chars)
    limit_total = 200000
    limited_text = text_str[:limit_total]

    # 2. Merge Heuristics or Metadata from Trafilatura
    metadata = extract_metadata_heuristics(limited_text, title)
    if base_metadata:
        # Only overwrite if the base_metadata has actual content
        for key, value in base_metadata.items():
            if value:
                metadata[key] = value
    
    # 3. Snippet for AI (Groq/Gemini) - 7500 chars
    ai_snippet = limited_text[:7500]
    
    # 4. Split text into 10 chunks (20,000 chars each)
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
        # HANDLING URL EXTRACTION (Direct Source Extraction via Trafilatura)
        if request.is_json:
            data = request.get_json()
            url = data.get('url')
            if not url:
                return jsonify({"status": "error", "message": "No URL provided"}), 400
            
            try:
                # Fetch content using trafilatura (handles some dynamic content and clean download)
                downloaded = trafilatura.fetch_url(url)
                if downloaded is None:
                    return jsonify({"status": "error", "message": "Failed to fetch content from URL. Site might be protected."}), 422
                
                # Extract clean text content
                full_text = trafilatura.extract(downloaded, include_comments=False, include_tables=True, no_fallback=False)
                # Extract metadata directly from source HTML tags
                metadata_raw = trafilatura.extract_metadata(downloaded)
                
                if not full_text:
                    return jsonify({"status": "error", "message": "Content extraction failed. No readable text found."}), 422

                # Map Trafilatura metadata to Xeenaps schema
                source_meta = {}
                if metadata_raw:
                    source_meta = {
                        "title": metadata_raw.title,
                        "authors": [metadata_raw.author] if metadata_raw.author else [],
                        "year": metadata_raw.date[:4] if metadata_raw.date else "",
                        "publisher": metadata_raw.sitename or metadata_raw.hostname or ""
                    }
                
                result_data = process_extracted_text(clean_text(full_text), source_meta.get("title") or url, source_meta)
                return jsonify({"status": "success", "data": result_data})

            except Exception as e:
                return jsonify({"status": "error", "message": f"Web Extraction Error: {str(e)}"}), 500

        # HANDLING FILE EXTRACTION (Remains robust for PDF/Office files)
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
