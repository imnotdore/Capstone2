import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';

export default function ExamFormView() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [formHtml, setFormHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [examData, setExamData] = useState(null);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('🎯 Fetching quiz for student, exam ID:', examId);
        
        // First, check if student can access this quiz
        const accessCheck = await api.get(`/exams/take/${examId}`);
        
        if (!accessCheck.success) {
          throw new Error(accessCheck.message || 'Cannot access this quiz');
        }

        setExamData(accessCheck.data);

        // Now fetch the form HTML
        const response = await api.get(`/exams/form/${examId}`);
        console.log('✅ Form response received');

        // Handle different response formats
        if (typeof response.data === 'string') {
          setFormHtml(response.data);
        } else if (response.data.html) {
          setFormHtml(response.data.html);
        } else {
          // If it's the exam object, generate form manually
          const exam = response.data.data || response.data;
          if (exam && exam.questions) {
            const generatedHtml = generateFormHTML(exam);
            setFormHtml(generatedHtml);
          } else {
            throw new Error('No form data received');
          }
        }
        
      } catch (err) {
        console.error('❌ Failed to load exam form:', err);
        setError(`Failed to load exam form: ${err.response?.data?.message || err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [examId]);

  // Enhanced form generator
  const generateFormHTML = (exam) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${exam.title} - Online Quiz</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: #f8f9fa; 
            color: #202124; 
            line-height: 1.6;
            padding: 20px;
        }
        .container { 
            max-width: 800px; 
            margin: 0 auto; 
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header { 
            background: white; 
            padding: 30px; 
            border-bottom: 1px solid #e8e8e8;
        }
        .exam-title { 
            font-size: 24px; 
            font-weight: 600; 
            color: #202124; 
            margin-bottom: 8px; 
        }
        .exam-description { 
            color: #5f6368; 
            font-size: 16px;
            margin-bottom: 20px;
        }
        .quiz-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            font-size: 14px;
            color: #5f6368;
        }
        .question-card { 
            background: white; 
            padding: 25px; 
            border-bottom: 1px solid #e8e8e8;
        }
        .question-card:last-child {
            border-bottom: none;
        }
        .question-number { 
            font-size: 16px; 
            color: #4285f4; 
            font-weight: 500; 
            margin-bottom: 8px; 
        }
        .question-text { 
            font-size: 16px; 
            color: #202124; 
            margin-bottom: 16px; 
            font-weight: 400; 
        }
        .answer-field { 
            width: 100%; 
            min-height: 120px; 
            padding: 12px; 
            border: 1px solid #dadce0; 
            border-radius: 8px; 
            font-family: inherit; 
            font-size: 14px; 
            resize: vertical; 
            transition: border 0.2s; 
        }
        .answer-field:focus { 
            outline: none; 
            border-color: #4285f4; 
            box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2); 
        }
        .submit-section { 
            background: #f8f9fa; 
            padding: 25px; 
            text-align: center; 
            border-top: 1px solid #e8e8e8;
        }
        .submit-btn { 
            background: #4285f4; 
            color: white; 
            border: none; 
            padding: 12px 32px; 
            border-radius: 6px; 
            font-size: 16px; 
            font-weight: 500; 
            cursor: pointer; 
            transition: background 0.2s; 
        }
        .submit-btn:hover { 
            background: #3367d6; 
        }
        .char-count { 
            font-size: 12px; 
            color: #5f6368; 
            text-align: right; 
            margin-top: 4px; 
        }
        .back-btn {
            background: #f1f3f4;
            color: #5f6368;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin-bottom: 20px;
            font-size: 14px;
        }
        .back-btn:hover {
            background: #e8eaed;
        }
    </style>
</head>
<body>
    <button class="back-btn" onclick="window.history.back()">← Back to Class</button>
    
    <div class="container">
        <div class="header">
            <h1 class="exam-title">${exam.title}</h1>
            <div class="exam-description">${exam.description || 'Please answer all questions below. Your responses will be saved automatically.'}</div>
            <div class="quiz-info">
                <strong>Instructions:</strong> Answer all questions. Your progress is auto-saved every 30 seconds.
            </div>
        </div>
        
        <form id="examForm">
            ${exam.questions.map((question, index) => `
                <div class="question-card">
                    <div class="question-number">Question ${index + 1}${question.required ? ' *' : ''}</div>
                    <div class="question-text">${question.title || question.question}</div>
                    <textarea 
                        class="answer-field" 
                        name="q${index}" 
                        placeholder="Type your answer here..." 
                        oninput="updateCharCount(this)"
                        ${question.required ? 'required' : ''}
                    ></textarea>
                    <div class="char-count"><span id="charCount${index}">0</span> characters</div>
                </div>
            `).join('')}
            
            <div class="submit-section">
                <button type="submit" class="submit-btn">Submit Answers</button>
            </div>
        </form>
    </div>

    <script>
        function updateCharCount(textarea) {
            const index = textarea.name.replace('q', '');
            const count = textarea.value.length;
            document.getElementById('charCount' + index).textContent = count;
        }
        
        document.getElementById('examForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const submitBtn = this.querySelector('.submit-btn');
            const originalText = submitBtn.textContent;
            
            try {
                submitBtn.textContent = 'Submitting...';
                submitBtn.disabled = true;
                
                const formData = new FormData(this);
                const answers = {};
                
                for (let [key, value] of formData.entries()) {
                    answers[key] = value;
                }
                
                const response = await fetch('/api/exams/submit/${exam._id}', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    },
                    body: JSON.stringify({ answers })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('✅ Answers submitted successfully!');
                    // Clear auto-save
                    localStorage.removeItem('exam_${exam._id}_autosave');
                    // Redirect back to class
                    window.location.href = '/dashboard';
                } else {
                    alert('❌ Error: ' + result.message);
                }
            } catch (error) {
                alert('❌ Network error. Please try again.');
                console.error('Submission error:', error);
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
        
        // Auto-save every 30 seconds
        setInterval(() => {
            const formData = new FormData(document.getElementById('examForm'));
            const answers = {};
            
            for (let [key, value] of formData.entries()) {
                answers[key] = value;
            }
            
            localStorage.setItem('exam_${exam._id}_autosave', JSON.stringify({
                answers,
                timestamp: new Date().toISOString()
            }));
            
            console.log('Auto-saved at:', new Date().toLocaleTimeString());
        }, 30000);
        
        // Load auto-saved answers
        window.addEventListener('load', () => {
            const saved = localStorage.getItem('exam_${exam._id}_autosave');
            if (saved) {
                try {
                    const { answers, timestamp } = JSON.parse(saved);
                    Object.keys(answers).forEach(key => {
                        const textarea = document.querySelector('[name="' + key + '"]');
                        if (textarea) {
                            textarea.value = answers[key];
                            updateCharCount(textarea);
                        }
                    });
                    console.log('Auto-saved answers loaded from:', new Date(timestamp).toLocaleString());
                } catch (e) {
                    console.error('Error loading auto-save:', e);
                }
            }
        });
    </script>
</body>
</html>`;
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading Quiz...</h2>
        <p>Please wait while we load your quiz.</p>
        <p>Exam ID: {examId}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Error Loading Quiz</h2>
        <p style={{ color: 'red', marginBottom: '20px' }}>{error}</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button 
            onClick={() => window.location.reload()} 
            style={{ padding: '10px 20px', background: '#4285f4', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Try Again
          </button>
          <button 
            onClick={() => navigate('/dashboard')}
            style={{ padding: '10px 20px', background: '#f1f3f4', color: '#5f6368', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: formHtml }} />
    </div>
  );
}