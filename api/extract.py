import io
import re
import trafilatura
import random
from playwright.sync_api import sync_playwright
from playwright_stealth import stealth_sync
from pypdf import PdfReader
from pptx import Presentation
from docx import Document
import openpyxl
from flask import Flask, request, jsonify

app = Flask(__name__)

# Set max content length to 25MB
app.config['MAX_CONTENT_LENGTH'] = 25 * 1024 * 1024

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0"
]

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

def fetch_with_playwright(url):
    """
    Simulates a real browser session to bypass bot protection and render JS.
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a random modern user agent
        user_agent = random.choice(USER_AGENTS)
        
        context = browser.new_context(
            user_agent=user_agent,
            viewport={'width': 1280, 'height': 800},
            device_scale_factor=1,
        )
        
        page = context.new_page()
        # Apply stealth patches
        stealth_sync(page)
        
        try:
            # Navigate with a generous timeout (30s)
            page.goto(url, wait_until="domcontentloaded", timeout=30000)
            
            # Wait for any potential dynamic redirects or network activity to settle
            page.wait_for_timeout(2000) 
            
            # Simulated Human Behavior: Scroll down to trigger lazy-loading
            page.evaluate("window.scrollTo(0, document.body.scrollHeight / 3)")
            page.wait_for_timeout(1000)
            
            # Get the fully rendered HTML
            html_content = page.content()
            return html_content
        except Exception as e:
            print(f"Playwright Error: {str(e)}")
            return None
        finally:
            browser.close()

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

    # 2. Merge Heuristics or Metadata from Trafilatura
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
        # HANDLING URL EXTRACTION (Browser-Like Fetching via Playwright)
        if request.is_json:
            data = request.get_json()
            url = data.get('url')
            if not url:
                return jsonify({"status": "error", "message": "No URL provided"}), 400
            
            # Use Playwright instead of trafilatura.fetch_url for the initial download
            html_source = fetch_with_playwright(url)
            
            if not html_source:
                return jsonify({
                    "status": "error", 
                    "message": "Failed to bypass site protection. The target website is blocking automated access."
                }), 422
            
            # Extract clean text from the Playwright HTML source
            full_text = trafilatura.extract(html_source, include_comments=False, include_tables=True)
            # Extract metadata from the Playwright HTML source
            metadata_raw = trafilatura.extract_metadata(html_source)
            
            if not full_text:
                return jsonify({"status": "error", "message": "Extraction succeeded but no readable text was found."}), 422

            # Map Trafilatura metadata
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

        # HANDLING FILE EXTRACTION (Remains unchanged for PDF/Office)
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
