from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import docx2txt
import PyPDF2
import re
import os
import tempfile

app = Flask(__name__)
CORS(app)

@app.route('/process-file', methods=['POST'])
def process_file():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=file.filename) as tmp_file:
            file.save(tmp_file.name)
            file_path = tmp_file.name

        try:
            # Process based on file type
            file_ext = file.filename.lower().split('.')[-1]
            
            if file_ext == 'pdf':
                questions = extract_questions_pdf(file_path)
            elif file_ext in ['docx', 'doc']:
                questions = extract_questions_docx(file_path)
            elif file_ext in ['xlsx', 'xls']:
                questions = extract_questions_excel(file_path)
            else:
                return jsonify({'error': 'Unsupported file type'}), 400
            
            return jsonify({
                'success': True,
                'questions': questions,
                'total_questions': len(questions)
            })
            
        finally:
            # Clean up temp file
            if os.path.exists(file_path):
                os.unlink(file_path)
                
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def extract_questions_pdf(file_path):
    """Extract questions from PDF"""
    questions = []
    with open(file_path, 'rb') as file:
        pdf_reader = PyPDF2.PdfReader(file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
    
    # Enhanced question detection
    patterns = [
        r'(?i)(?:question\s*\d*[:.]?|q\s*\d*[:.]?|\d+\.)\s*(.+?\?)',
        r'([A-Z][^.!?]*\?)'
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, text)
        for match in matches:
            question_text = match.strip()
            if len(question_text) > 5:  # Reasonable minimum
                questions.append({
                    'type': 'essay',
                    'question': question_text,
                    'options': [],
                    'answer': ''
                })
    
    return questions

def extract_questions_docx(file_path):
    """Extract questions from Word document"""
    text = docx2txt.process(file_path)
    questions = []
    
    lines = text.split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Detect questions more effectively
        if (line.endswith('?') or 
            re.match(r'^(?:\d+|[a-zA-Z])[\.\)]', line) or
            re.search(r'(?i)(question|q[:.]|tanong)', line)):
            
            questions.append({
                'type': 'essay',
                'question': line,
                'options': [],
                'answer': ''
            })
    
    return questions

def extract_questions_excel(file_path):
    """Extract questions from Excel file"""
    questions = []
    
    try:
        # Try reading with pandas
        df = pd.read_excel(file_path)
        
        # Look for question column (case insensitive)
        question_col = None
        for col in df.columns:
            if 'question' in str(col).lower():
                question_col = col
                break
        
        if question_col is None and len(df.columns) > 0:
            question_col = df.columns[0]  # Use first column as fallback
        
        if question_col is not None:
            for index, row in df.iterrows():
                question_text = str(row[question_col]).strip()
                if question_text and question_text != 'nan' and len(question_text) > 3:
                    questions.append({
                        'type': 'essay',
                        'question': question_text,
                        'options': [],
                        'answer': ''
                    })
    
    except Exception as e:
        raise Exception(f"Excel processing error: {str(e)}")
    
    return questions

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'Python service is running! 🐍'})

if __name__ == '__main__':
    print("🚀 Python File Processor starting on port 5000...")
    app.run(port=5000, debug=True)