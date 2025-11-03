import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api';

export default function ExamFormView() {
  const { examId } = useParams();
  const [formHtml, setFormHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('Fetching form for exam:', examId);
        
        const response = await api.get(`/exams/form/${examId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Backend response:', response);
        console.log('Response data type:', typeof response.data);
        console.log('Response data:', response.data);

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
        console.error('Failed to load exam form:', err);
        setError(`Failed to load exam form: ${err.response?.data?.message || err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [examId]);

  // Fallback form generator (in case backend doesn't return HTML)
  const generateFormHTML = (exam) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${exam.title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .question { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
          label { display: block; margin-bottom: 10px; font-weight: bold; }
          textarea { width: 100%; padding: 10px; margin-top: 5px; }
          button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
        </style>
      </head>
      <body>
        <h1>${exam.title}</h1>
        <form id="examForm">
          ${exam.questions.map((q, i) => `
            <div class="question">
              <label>Question ${i + 1}: ${q.question}</label>
              <textarea name="q${i}" rows="4" placeholder="Your answer..."></textarea>
            </div>
          `).join('')}
          <button type="submit">Submit Answers</button>
        </form>
        <script>
          document.getElementById('examForm').addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Answers submitted! (This is a preview)');
          });
        </script>
      </body>
      </html>
    `;
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading Exam Form...</h2>
        <p>Exam ID: {examId}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Error Loading Exam</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }

  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: formHtml }} />
    </div>
  );
}