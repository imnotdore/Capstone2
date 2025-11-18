from flask import Flask, request, jsonify
from flask_cors import CORS
import PyPDF2
import io
from docx import Document
import pandas as pd
import re
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

def parse_questions_from_text(text):
    """Parse questions from text with high accuracy"""
    questions = []
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    
    current_question = None
    question_number = 0
    
    print(f"📄 Processing {len(lines)} lines...")
    
    for i, line in enumerate(lines):
        print(f"🔍 Line {i}: {line}")
        
        # Detect question number (1., 2., etc.)
        question_match = re.match(r'^(\d+)\.\s*(.+)$', line)
        if question_match:
            if current_question and current_question['title']:
                questions.append(current_question)
                print(f"💾 Saved question: {current_question['title'][:30]}...")
            
            question_number += 1
            current_question = {
                'type': 'multiple-choice',
                'title': question_match.group(2),
                'options': [],
                'correctAnswer': None,
                'correctAnswers': [],
                'answerKey': '',
                'points': 1,
                'order': question_number - 1,
                'required': False
            }
            print(f"❓ New question: {current_question['title'][:30]}...")
            continue
        
        # Detect options (A), B), A., B., etc.)
        option_match = re.match(r'^([A-D])[\)\.]\s*(.+)$', line, re.IGNORECASE)
        if option_match and current_question:
            option_text = option_match.group(2).strip()
            current_question['options'].append(option_text)
            print(f"📝 Added option {option_match.group(1)}: {option_text}")
            continue
        
        # Detect ANSWER
        answer_match = re.match(r'^ANSWER:\s*(.+)$', line, re.IGNORECASE)
        if answer_match and current_question:
            answer_value = answer_match.group(1).strip()
            print(f"🎯 Processing ANSWER: {answer_value}")
            process_answer(current_question, answer_value)
            continue
        
        # Detect POINTS
        points_match = re.match(r'^POINTS:\s*(\d+)$', line, re.IGNORECASE)
        if points_match and current_question:
            current_question['points'] = int(points_match.group(1))
            print(f"⭐ Set points: {current_question['points']}")
            continue
    
    # Add the last question
    if current_question and current_question['title']:
        questions.append(current_question)
        print(f"💾 Saved final question: {current_question['title'][:30]}...")
    
    print(f"🎉 Parsed {len(questions)} questions total")
    return questions

def process_answer(question, answer_value):
    """Process answer based on question type and options"""
    print(f"🔧 Processing answer: '{answer_value}' for question with {len(question['options'])} options")
    
    if question['options']:  # Has options
        if ',' in answer_value:
            # Multiple answers (checkboxes)
            answers = [ans.strip().upper() for ans in answer_value.split(',')]
            indices = [ord(ans) - ord('A') for ans in answers if ans in 'ABCD']
            if indices:
                question['correctAnswers'] = indices
                question['type'] = 'checkboxes'
                print(f"✅ Set CHECKBOX answers: {answers} -> indices: {indices}")
        else:
            # Single answer (multiple choice)
            answer_index = ord(answer_value.upper()) - ord('A')
            if 0 <= answer_index < len(question['options']):
                question['correctAnswer'] = answer_index
                question['type'] = 'multiple-choice'
                print(f"✅ Set MULTIPLE-CHOICE answer: {answer_value} -> index: {answer_index}")
            else:
                print(f"❌ Invalid answer index: {answer_value}")
    else:
        # Text answer
        question['answerKey'] = answer_value
        question['type'] = 'paragraph' if len(answer_value) > 50 else 'short-answer'
        print(f"✅ Set TEXT answer ({question['type']}): {answer_value}")

def parse_pdf(file_content):
    """Extract text from PDF"""
    try:
        pdf_file = io.BytesIO(file_content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        print(f"❌ PDF parsing error: {e}")
        return ""

def parse_docx(file_content):
    """Extract text from Word document"""
    try:
        doc_file = io.BytesIO(file_content)
        doc = Document(doc_file)
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        return text
    except Exception as e:
        print(f"❌ DOCX parsing error: {e}")
        return ""

def parse_excel(file_content):
    """Parse questions from Excel file"""
    try:
        excel_file = io.BytesIO(file_content)
        df = pd.read_excel(excel_file)
        questions = []
        
        for index, row in df.iterrows():
            if pd.notna(row.get('Question')) and str(row['Question']).strip():
                question = {
                    'type': str(row.get('Type', 'multiple-choice')).lower(),
                    'title': str(row['Question']),
                    'options': [],
                    'correctAnswer': None,
                    'correctAnswers': [],
                    'answerKey': '',
                    'points': int(row.get('Points', 1)),
                    'order': index,
                    'required': False
                }
                
                # Add options
                for option_col in ['OptionA', 'OptionB', 'OptionC', 'OptionD']:
                    if option_col in row and pd.notna(row[option_col]):
                        option_text = str(row[option_col]).strip()
                        if option_text:
                            question['options'].append(option_text)
                
                # Process answer
                if 'Answer' in row and pd.notna(row['Answer']):
                    process_answer(question, str(row['Answer']))
                
                questions.append(question)
                print(f"📊 Excel question: {question['title'][:30]}...")
        
        return questions
    except Exception as e:
        print(f"❌ Excel parsing error: {e}")
        return []

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'success': True, 'message': 'Python parser is running!'})

@app.route('/parse-file', methods=['POST'])
def parse_file():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'No file uploaded'})
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No file selected'})
        
        print(f"📁 Received file: {file.filename}")
        file_content = file.read()
        
        # Determine file type and parse
        filename_lower = file.filename.lower()
        questions = []
        
        if filename_lower.endswith('.pdf'):
            print("🔍 Processing PDF file...")
            text = parse_pdf(file_content)
            questions = parse_questions_from_text(text)
        elif filename_lower.endswith(('.docx', '.doc')):
            print("🔍 Processing Word file...")
            text = parse_docx(file_content)
            questions = parse_questions_from_text(text)
        elif filename_lower.endswith(('.xlsx', '.xls')):
            print("🔍 Processing Excel file...")
            questions = parse_excel(file_content)
        elif filename_lower.endswith('.txt'):
            print("🔍 Processing text file...")
            text = file_content.decode('utf-8')
            questions = parse_questions_from_text(text)
        else:
            return jsonify({'success': False, 'message': 'Unsupported file type'})
        
        if not questions:
            return jsonify({'success': False, 'message': 'No questions could be parsed from the file'})
        
        return jsonify({
            'success': True,
            'data': {
                'questions': questions,
                'title': f'Quiz from {file.filename}',
                'description': f'Automatically imported from {file.filename}'
            }
        })
        
    except Exception as e:
        print(f"❌ Error in parse-file: {e}")
        return jsonify({'success': False, 'message': f'Error processing file: {str(e)}'})

if __name__ == '__main__':
    print("🚀 Starting Python File Parser on port 5000...")
    app.run(port=5000, debug=True)