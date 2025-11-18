// pages/StudentQuiz.jsx - NEW FILE
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuizForStudent, submitQuizAnswers } from '../lib/api';

export default function StudentQuiz() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const response = await getQuizForStudent(examId);
        if (response.success) {
          setQuiz(response.data);
        } else {
          alert('Quiz not available: ' + response.message);
          navigate(-1);
        }
      } catch (error) {
        console.error('Failed to load quiz:', error);
        alert('Failed to load quiz');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [examId, navigate]);

  const handleAnswerChange = (questionIndex, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: value
    }));
  };

  const handleSubmit = async () => {
    if (!window.confirm('Are you sure you want to submit your answers?')) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await submitQuizAnswers(examId, answers);
      if (response.success) {
        alert('Quiz submitted successfully!');
        navigate(-1); // Go back to class details
      } else {
        alert('Failed to submit quiz: ' + response.message);
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading quiz...</div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-red-600">Quiz not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{quiz.title}</h1>
        <p className="text-gray-600">{quiz.description}</p>
        <div className="mt-4 text-sm text-gray-500">
          Created by: {quiz.createdBy?.name || 'Teacher'} • 
          Questions: {quiz.questions?.length || 0}
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {quiz.questions?.map((question, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start mb-4">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mr-3">
                Q{index + 1}
              </span>
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">
                  {question.title}
                </h3>
                {question.required && (
                  <span className="text-red-500 text-sm">* Required</span>
                )}
              </div>
            </div>

            {/* Answer Input Based on Question Type */}
            <div className="ml-8">
              {question.type === 'multiple-choice' && (
                <div className="space-y-2">
                  {question.options?.map((option, optionIndex) => (
                    <label key={optionIndex} className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name={`question-${index}`}
                        value={option}
                        checked={answers[index] === option}
                        onChange={() => handleAnswerChange(index, option)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {question.type === 'checkboxes' && (
                <div className="space-y-2">
                  {question.options?.map((option, optionIndex) => (
                    <label key={optionIndex} className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={answers[index]?.includes(option) || false}
                        onChange={(e) => {
                          const currentAnswers = answers[index] || [];
                          let newAnswers;
                          if (e.target.checked) {
                            newAnswers = [...currentAnswers, option];
                          } else {
                            newAnswers = currentAnswers.filter(a => a !== option);
                          }
                          handleAnswerChange(index, newAnswers);
                        }}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {(question.type === 'short-answer' || question.type === 'paragraph') && (
                <textarea
                  value={answers[index] || ''}
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                  placeholder="Type your answer here..."
                  rows={question.type === 'paragraph' ? 4 : 2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}

              {question.type === 'dropdown' && (
                <select
                  value={answers[index] || ''}
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select an option</option>
                  {question.options?.map((option, optionIndex) => (
                    <option key={optionIndex} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              )}

              {question.type === 'linear-scale' && (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">{question.scale?.minLabel || question.scale?.min}</span>
                  <div className="flex space-x-2">
                    {Array.from(
                      { length: (question.scale?.max || 5) - (question.scale?.min || 1) + 1 },
                      (_, i) => (question.scale?.min || 1) + i
                    ).map((num) => (
                      <label key={num} className="flex flex-col items-center">
                        <input
                          type="radio"
                          name={`question-${index}`}
                          value={num}
                          checked={answers[index] === num.toString()}
                          onChange={() => handleAnswerChange(index, num.toString())}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm mt-1">{num}</span>
                      </label>
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">{question.scale?.maxLabel || question.scale?.max}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Submit Button */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting...' : 'Submit Quiz'}
        </button>
      </div>
    </div>
  );
}