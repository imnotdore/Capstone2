// frontend/src/pages/QuizFormPage.jsx - UPDATED WITH FILE UPLOAD
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { createQuiz, updateQuiz, getQuizForEdit, deployExam, uploadFileAndParse } from '../lib/api'; // ✅ ADDED uploadFileAndParse
import './QuizFormPage.css';

const QuizFormPage = () => {
  const { classId, examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const existingExamFromState = location.state?.exam;
  
  const [quiz, setQuiz] = useState({
    title: 'Untitled form',
    description: 'Form description',
    questions: [],
    isQuiz: true,
    totalPoints: 0
  });
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false); // ✅ ADDED: Separate loading for upload
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (examId || existingExamFromState) {
      loadExistingQuiz();
    }
  }, [examId, existingExamFromState]);

  useEffect(() => {
    const total = quiz.questions.reduce((sum, question) => sum + (question.points || 1), 0);
    setQuiz(prev => ({ ...prev, totalPoints: total }));
  }, [quiz.questions]);

  const loadExistingQuiz = async () => {
    try {
      setLoading(true);
      if (existingExamFromState) {
        setQuiz(existingExamFromState);
        setEditing(true);
      } else if (examId) {
        const response = await getQuizForEdit(examId);
        if (response.success) {
          setQuiz(response.data);
          setEditing(true);
        }
      }
    } catch (error) {
      console.error('Failed to load quiz:', error);
      alert('Failed to load quiz: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  // ✅ ADDED: File upload handler
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    
    if (!validTypes.includes(file.type)) {
      alert('Please upload a PDF or Word document (.pdf, .doc, .docx)');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    try {
      setUploadLoading(true);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('classId', classId);

      const response = await uploadFileAndParse(formData);
      
      if (response.success) {
        const { questions, title, description } = response.data;
        
        // Merge uploaded questions with existing ones
        const newQuestions = questions.map((q, index) => ({
          ...q,
          id: Date.now() + Math.random() + index, // Ensure unique IDs
          order: quiz.questions.length + index,
          points: q.points || 1,
          correctAnswer: q.correctAnswer || null,
          correctAnswers: q.correctAnswers || [],
          answerKey: q.answerKey || ''
        }));

        setQuiz(prev => ({
          ...prev,
          title: title || prev.title,
          description: description || prev.description,
          questions: [...prev.questions, ...newQuestions]
        }));

        alert(`Successfully imported ${questions.length} questions from ${file.name}`);
      }
    } catch (error) {
      console.error('File upload failed:', error);
      alert('Failed to process file: ' + (error.response?.data?.message || error.message));
    } finally {
      setUploadLoading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const addQuestion = () => {
    const newQuestion = {
      id: Date.now() + Math.random(),
      type: 'multiple-choice',
      title: 'Untitled Question',
      required: false,
      points: 1,
      order: quiz.questions.length,
      options: ['Option 1'],
      correctAnswer: null,
      correctAnswers: [],
      answerKey: ''
    };

    setQuiz(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  };

  const updateQuestion = (questionId, updates) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === questionId ? { ...q, ...updates } : q
      )
    }));
  };

  const deleteQuestion = (questionId) => {
    setQuiz(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId)
    }));
  };

  const duplicateQuestion = (questionId) => {
    const questionToDuplicate = quiz.questions.find(q => q.id === questionId);
    if (questionToDuplicate) {
      const duplicatedQuestion = {
        ...questionToDuplicate,
        id: Date.now() + Math.random(),
        title: `${questionToDuplicate.title} (Copy)`
      };
      setQuiz(prev => ({
        ...prev,
        questions: [...prev.questions, duplicatedQuestion]
      }));
    }
  };

  const handleSaveQuiz = async () => {
    try {
      setLoading(true);
      
      const questionsForBackend = quiz.questions.map(({ id, ...question }) => question);

      let response;
      if (editing) {
        const examIdToUpdate = examId || quiz._id;
        response = await updateQuiz(examIdToUpdate, {
          title: quiz.title,
          description: quiz.description,
          questions: questionsForBackend,
          totalPoints: quiz.totalPoints
        });
      } else {
        response = await createQuiz(classId, {
          title: quiz.title,
          description: quiz.description,
          questions: questionsForBackend,
          isQuiz: true,
          totalPoints: quiz.totalPoints
        });
      }

      if (response.success) {
        alert(editing ? 'Form updated successfully!' : 'Form created successfully!');
        navigate(`/class/${classId}`, {
          state: { 
            activeTab: 'classwork',
            refresh: true 
          }
        });
      }
    } catch (error) {
      console.error('Failed to save form:', error);
      alert('Failed to save form: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeployQuiz = async () => {
    try {
      setLoading(true);
      
      const questionsForBackend = quiz.questions.map(({ id, ...question }) => question);

      let response;
      let savedExamId;

      if (editing) {
        const examIdToUpdate = examId || quiz._id;
        response = await updateQuiz(examIdToUpdate, {
          title: quiz.title,
          description: quiz.description,
          questions: questionsForBackend,
          totalPoints: quiz.totalPoints
        });
        savedExamId = examIdToUpdate;
      } else {
        response = await createQuiz(classId, {
          title: quiz.title,
          description: quiz.description,
          questions: questionsForBackend,
          isQuiz: true,
          totalPoints: quiz.totalPoints
        });
        savedExamId = response.data._id;
      }

      if (response.success) {
        const deployResponse = await deployExam(savedExamId);
        
        if (deployResponse.success) {
          alert('Quiz deployed successfully! Students can now see it in classwork.');
          navigate(`/class/${classId}`, {
            state: { 
              activeTab: 'classwork',
              refresh: true 
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to deploy quiz:', error);
      alert('Failed to deploy quiz: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  if (loading && (examId || existingExamFromState)) {
    return (
      <div className="quiz-form-container">
        <div className="loading">Loading form...</div>
      </div>
    );
  }

  return (
    <div className="quiz-form-container">
      <div className="quiz-form-header">
        <button 
          className="back-btn"
          onClick={() => navigate(`/class/${classId}`, { 
            state: { activeTab: 'classwork' }
          })}
        >
          ← Back to Class
        </button>
        <div className="header-actions">
          <button className="preview-btn">👁️ Preview</button>
          <button 
            className="save-btn"
            onClick={handleSaveQuiz}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Draft'}
          </button>

          <button 
            className="deploy-btn"
            onClick={handleDeployQuiz}
            disabled={loading || quiz.questions.length === 0}
          >
            {loading ? 'Deploying...' : '🚀 Deploy'}
          </button>
        </div>
      </div>

      <div className="quiz-form-content">
        <div className="form-header-section">
          <div className="form-header-content">
            <input
              type="text"
              className="form-title"
              value={quiz.title}
              onChange={(e) => setQuiz(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Untitled form"
            />
            <input
              type="text"
              className="form-description"
              value={quiz.description}
              onChange={(e) => setQuiz(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Form description"
            />
            <div className="total-points-display">
              Total Points: <strong>{quiz.totalPoints}</strong>
            </div>
          </div>
        </div>

        {/* ✅ ADDED: File Upload Section */}
        <div className="file-upload-section">
          <div className="upload-card">
            <div className="upload-icon">📄</div>
            <h3>Import Questions from File</h3>
            <p>Upload a PDF or Word document to automatically generate questions</p>
            
            <label className="file-upload-btn">
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
                onChange={handleFileUpload}
                disabled={uploadLoading}
                style={{ display: 'none' }}
              />
              {uploadLoading ? 'Processing...' : 'Choose File (PDF/Word)'}
            </label>
            
            <div className="upload-info">
              <small>Supported formats: PDF, DOC, DOCX (Max 10MB)</small>
            </div>
          </div>
        </div>

        <div className="questions-list">
          {quiz.questions.map((question, index) => (
            <QuestionEditor
              key={question.id}
              question={question}
              index={index}
              onUpdate={(updates) => updateQuestion(question.id, updates)}
              onDelete={() => deleteQuestion(question.id)}
              onDuplicate={() => duplicateQuestion(question.id)}
            />
          ))}
        </div>

        <div className="add-question-section">
          <button className="add-question-btn" onClick={addQuestion}>
            <span className="add-icon">+</span>
            Add question manually
          </button>
        </div>

        <div className="form-actions">
          <button 
            className="save-btn" 
            onClick={handleSaveQuiz}
            disabled={loading}
          >
            {loading ? 'Saving...' : (editing ? 'Update Draft' : 'Save Draft')}
          </button>
          <button 
            className="deploy-btn large"
            onClick={handleDeployQuiz}
            disabled={loading || quiz.questions.length === 0}
          >
            {loading ? 'Deploying...' : '🚀 Deploy Quiz'}
          </button>
          <button 
            className="cancel-btn"
            onClick={() => navigate(`/class/${classId}`, { 
              state: { activeTab: 'classwork' }
            })}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};


// ✅ UPDATED QuestionEditor Component with Answer Key & Points
const QuestionEditor = ({ question, index, onUpdate, onDelete, onDuplicate }) => {
  const handleTitleChange = (e) => {
    onUpdate({ title: e.target.value });
  };

  const handlePointsChange = (e) => {
    const points = Math.max(1, parseInt(e.target.value) || 1);
    onUpdate({ points });
  };

  const addOption = () => {
    const newOptions = [...question.options, `Option ${question.options.length + 1}`];
    onUpdate({ options: newOptions });
  };

  const updateOption = (optionIndex, value) => {
    const newOptions = [...question.options];
    newOptions[optionIndex] = value;
    onUpdate({ options: newOptions });
  };

  const deleteOption = (optionIndex) => {
    if (question.options.length > 1) {
      const newOptions = question.options.filter((_, idx) => idx !== optionIndex);
      onUpdate({ options: newOptions });
    }
  };

  // ✅ ADDED: Answer key handlers
  const handleCorrectAnswerChange = (optionIndex) => {
    if (question.type === 'multiple-choice') {
      onUpdate({ correctAnswer: optionIndex });
    } else if (question.type === 'checkboxes') {
      const currentAnswers = question.correctAnswers || [];
      const newAnswers = currentAnswers.includes(optionIndex)
        ? currentAnswers.filter(idx => idx !== optionIndex)
        : [...currentAnswers, optionIndex];
      onUpdate({ correctAnswers: newAnswers });
    }
  };

  const handleAnswerKeyChange = (e) => {
    onUpdate({ answerKey: e.target.value });
  };

  const handleQuestionTypeChange = (newType) => {
    const updates = { type: newType };
    
    // Reset answer keys when type changes
    updates.correctAnswer = null;
    updates.correctAnswers = [];
    updates.answerKey = '';
    
    switch (newType) {
      case 'multiple-choice':
      case 'checkboxes':
        updates.options = ['Option 1'];
        break;
      case 'short-answer':
      case 'paragraph':
        updates.options = [];
        break;
      default:
        updates.options = question.options || ['Option 1'];
    }
    
    onUpdate(updates);
  };

  return (
    <div className="question-editor">
      <div className="question-header">
        <input
          type="text"
          value={question.title}
          onChange={handleTitleChange}
          className="question-title"
          placeholder="Question"
        />
        <div className="question-type-dropdown">
          <select
            value={question.type}
            onChange={(e) => handleQuestionTypeChange(e.target.value)}
            className="question-type-select"
          >
            <option value="multiple-choice">Multiple choice</option>
            <option value="checkboxes">Checkboxes</option>
            <option value="short-answer">Short answer</option>
            <option value="paragraph">Paragraph</option>
          </select>
        </div>
      </div>
      
      {/* ✅ ADDED: Points input */}
      <div className="question-points">
        <label>Points:</label>
        <input
          type="number"
          min="1"
          value={question.points || 1}
          onChange={handlePointsChange}
          className="points-input"
        />
      </div>
      
      <div className="question-content">
        {(question.type === 'multiple-choice' || question.type === 'checkboxes') && (
          <div className="options-container">
            {question.options.map((option, idx) => (
              <div key={idx} className="option-item">
                <span className="option-icon">
                  {question.type === 'multiple-choice' ? '○' : '☐'}
                </span>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(idx, e.target.value)}
                  className="option-input"
                  placeholder={`Option ${idx + 1}`}
                />
                
                {/* ✅ ADDED: Answer key selector */}
                <label className="correct-answer-checkbox">
                  <input
                    type={question.type === 'multiple-choice' ? 'radio' : 'checkbox'}
                    name={`correct-answer-${question.id}`}
                    checked={
                      question.type === 'multiple-choice' 
                        ? question.correctAnswer === idx
                        : (question.correctAnswers || []).includes(idx)
                    }
                    onChange={() => handleCorrectAnswerChange(idx)}
                  />
                  Correct
                </label>

                {question.options.length > 1 && (
                  <button
                    onClick={() => deleteOption(idx)}
                    className="delete-option-btn"
                    type="button"
                    title="Remove option"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button onClick={addOption} className="add-option-btn" type="button">
              Add option
            </button>
          </div>
        )}

        {question.type === 'short-answer' && (
          <div className="short-answer-container">
            <input
              type="text"
              className="short-answer-input"
              placeholder="Short answer text"
              disabled
            />
            {/* ✅ ADDED: Answer key for short answer */}
            <div className="answer-key-section">
              <label>Correct Answer:</label>
              <input
                type="text"
                value={question.answerKey || ''}
                onChange={handleAnswerKeyChange}
                className="answer-key-input"
                placeholder="Enter the correct answer"
              />
            </div>
          </div>
        )}

        {question.type === 'paragraph' && (
          <div className="paragraph-container">
            <textarea
              className="paragraph-input"
              placeholder="Long answer text"
              disabled
              rows={3}
            />
            {/* ✅ ADDED: Answer key for paragraph */}
            <div className="answer-key-section">
              <label>Expected Answer Key:</label>
              <textarea
                value={question.answerKey || ''}
                onChange={handleAnswerKeyChange}
                className="answer-key-textarea"
                placeholder="Enter the expected answer or key points"
                rows={3}
              />
            </div>
          </div>
        )}
      </div>

      <div className="question-footer">
        <div className="question-actions">
          <button 
            className="duplicate-btn"
            onClick={onDuplicate}
            title="Duplicate question"
            type="button"
          >
            📄 Duplicate
          </button>
          <button 
            className="delete-question-btn"
            onClick={onDelete}
            title="Delete question"
            type="button"
          >
            🗑️ Delete
          </button>
        </div>
        <label className="required-toggle">
          <input
            type="checkbox"
            checked={question.required}
            onChange={(e) => onUpdate({ required: e.target.checked })}
          />
          Required
        </label>
      </div>
    </div>
  );
};

export default QuizFormPage;