
import io
import re
import requests
from readability import Document as ReadabilityDoc
from bs4 import BeautifulSoup
from pypdf import PdfReader
from pptx import Presentation
from docx import Document
import openpyxl
from flask import Flask, request, jsonify

app = Flask(__name__)

# Mengatur batas maksimal konten agar Flask menerima file hingga 25MB
app.config['MAX_CONTENT_LENGTH'] = 25 * 1024 * 1024

def clean_text(text):
    # Membersihkan karakter aneh dan spasi berlebih
    text = re.sub(r'([A-Z])\s(?=[a-z])', r'\1', text) 
    return " ".join(text.split())

def extract_metadata_heuristics(full_text, filename_or_title):
    metadata = {
        "title": filename_or_title.rsplit('.', 1)[0].replace("_", " ") if '.' in filename_or_title else filename_or_title,
        "authors": [],
        "year": "",
        "publisher": "",
        "keywords": [],
        "category": "Original Research",
        "type": "Literature"
    }

    # Ekstraksi Tahun
    year_match = re.search(r'\b(19|20)\d{2}\b', full_text[:5000])
    if year_match:
        metadata["year"] = year_match.group(0)

    # Heuristik Penerbit Sederhana
    publishers = ["Elsevier", "Springer", "IEEE", "MDPI", "Nature", "Science", "Wiley", "Taylor & Francis", "ACM", "Frontiers", "Sage", "Medium", "BBC", "CNN", "Wikipedia"]
    for pub in publishers:
        if pub.lower() in full_text[:10000].lower():
            metadata["publisher"] = pub
            break

    return metadata

def process_extracted_text(full_text, title):
    # 1. Batasi total teks (200.000 karakter)
    limit_total = 200000
    limited_text = full_text[:limit_total]

    # 2. Heuristik metadata
    metadata = extract_metadata_heuristics(limited_text, title)
    
    # 3. Snippet untuk AI (Groq/Gemini) - 7500 karakter
    ai_snippet = limited_text[:7500]
    
    # 4. Split teks ke dalam 10 chunks (masing-masing 20.000 karakter)
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
        # HANDLING URL EXTRACTION (JSON Payload)
        if request.is_json:
            data = request.get_json()
            url = data.get('url')
            if not url:
                return jsonify({"status": "error", "message": "No URL provided"}), 400
            
            try:
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
                }
                response = requests.get(url, headers=headers, timeout=15)
                response.raise_for_status()
                
                # Alur: Readability (Main Extraction)
                doc = ReadabilityDoc(response.content)
                summary_html = doc.summary()
                title = doc.short_title()
                
                # Alur: BeautifulSoup (Paragraph Cleaning)
                soup = BeautifulSoup(summary_html, 'lxml')
                # Remove unwanted tags that might still be there
                for s in soup(['script', 'style', 'nav', 'header', 'footer', 'aside']):
                    s.decompose()
                
                full_text = soup.get_text(separator=' ')
                full_text = clean_text(full_text)
                
                if not full_text.strip():
                    return jsonify({"status": "error", "message": "Readability failed to find main content. Page might be protected or too complex."}), 422
                
                result_data = process_extracted_text(full_text, title)
                return jsonify({"status": "success", "data": result_data})

            except Exception as e:
                return jsonify({"status": "error", "message": f"Web Extraction Error: {str(e)}"}), 500

        # HANDLING FILE EXTRACTION (Multipart Form Data)
        if 'file' not in request.files:
            return jsonify({"status": "error", "message": "No file part"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"status": "error", "message": "No file selected"}), 400

        filename_lower = file.filename.lower()
        
        audio_video_ext = ('.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm')
        if filename_lower.endswith(audio_video_ext):
            return jsonify({"status": "error", "message": "Audio and video files are not supported."}), 400

        legacy_ext = ('.doc', '.xls', '.ppt')
        if filename_lower.endswith(legacy_ext):
             return jsonify({
                "status": "error", 
                "message": f"Legacy format detected. Please convert to modern format (.docx, .xlsx, .pptx)."
            }), 422

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
        return jsonify({"status": "error", "message": f"Internal Server Error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(port=5000)
