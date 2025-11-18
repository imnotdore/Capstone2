import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getQuizForStudent, submitQuizAnswers } from '../lib/api';
import './StudentQuizPage.css';

const ProctoringMonitor = React.memo(({ isActive, onViolation }) => {
  const [videoStream, setVideoStream] = useState(null);
  const [detectionResults, setDetectionResults] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [proctoringError, setProctoringError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const detectionInterval = useRef(null);

  // Check if proctoring server is running
  const checkProctoringServer = async () => {
    try {
      console.log('🔍 Checking proctoring server...');
      const response = await fetch('http://localhost:5000/health');
      if (response.ok) {
        console.log('✅ Proctoring server is running');
        return true;
      }
    } catch (error) {
      console.error('❌ Proctoring server not available:', error);
      setProctoringError('Proctoring server not available. Continuing without proctoring.');
      return false;
    }
    return false;
  };

  // Initialize camera
  const initializeCamera = async () => {
    try {
      console.log("📷 Initializing camera...");
      
      // Check if proctoring server is available
      const serverAvailable = await checkProctoringServer();
      if (!serverAvailable) {
        console.log('⚠️ Continuing without proctoring');
        return;
      }
      
      // Request camera and microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: true
      });
      
      setVideoStream(stream);
      setPermissionGranted(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      console.log("✅ Camera initialized successfully");
      startDetection();
      
    } catch (error) {
      console.error("❌ Camera initialization failed:", error);
      setPermissionDenied(true);
      onViolation('camera_permission_denied', 'Camera access is required for this exam');
    }
  };

  // Detect suspicious activity
  const detectSuspiciousActivity = async () => {
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (!video || !canvas) return;
      
      const context = canvas.getContext('2d');
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to base64 for sending to proctoring API
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      console.log('🔄 Sending to proctoring server...');
      
      // Send to proctoring server with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('http://localhost:5000/detect-faces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageData }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const results = await response.json();
        setDetectionResults(results);
        
        // Check for violations
        checkViolations(results);
      } else {
        console.error('❌ Proctoring server error:', response.status);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('⏰ Proctoring request timeout');
      } else {
        console.error('❌ Detection error:', error);
      }
    }
  };



  // Check for proctoring violations
  const checkViolations = (results) => {
    const violations = [];
    
    // No face detected
    if (!results.faceDetected) {
      violations.push('no_face_detected');
    }
    
    // Multiple faces
    if (results.faceCount > 1) {
      violations.push('multiple_faces');
    }
    
    // Looking away
    if (results.facesLookingAway > 0) {
      violations.push('looking_away');
    }
    
    // No eyes detected (possible eye closure)
    if (results.faceDetected && !results.eyeDetected) {
      violations.push('eyes_not_detected');
    }
    
    // Hand detected near face
    if (results.handDetected) {
      violations.push('hand_detected');
    }
    
    // Trigger violation callback if any violations found
    if (violations.length > 0) {
      onViolation(violations[0], results.suspiciousActivities?.[0] || 'Suspicious activity detected');
    }
  };

  // Cleanup function
  const cleanup = () => {
    if (detectionInterval.current) {
      clearInterval(detectionInterval.current);
    }
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
    }
  };

  useEffect(() => {
    if (isActive && !permissionGranted && !permissionDenied) {
      initializeCamera();
    }
    
    return () => {
      cleanup();
    };
  }, [isActive]);

  if (!isActive) return null;

  if (permissionDenied) {
    return (
      <div className="proctoring-denied">
        <div className="denied-content">
          <div className="denied-icon">❌</div>
          <h3>Camera Access Required</h3>
          <p>This exam requires camera and microphone access for proctoring.</p>
          <p>Please enable camera permissions and refresh the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="proctoring-monitor">
      <div className="proctoring-header">
        <h4>🛡️ Proctoring Active</h4>
        <div className="proctoring-status">
          {detectionResults?.faceDetected ? (
            <span className="status-good">✅ Monitoring</span>
          ) : (
            <span className="status-warning">⚠️ No face detected</span>
          )}
        </div>
      </div>
      
      <div className="camera-feed">
        <video 
          ref={videoRef}
          autoPlay 
          muted 
          playsInline
          className="camera-video"
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
      
      {detectionResults && (
        <div className="detection-results">
          <div className="results-grid">
            <div className="result-item">
              <span>Faces:</span>
              <strong>{detectionResults.faceCount}</strong>
            </div>
            <div className="result-item">
              <span>Eyes:</span>
              <strong>{detectionResults.eyeDetected ? 'Detected' : 'Not detected'}</strong>
            </div>
            <div className="result-item">
              <span>Gaze:</span>
              <strong>
                {detectionResults.facesLookingForward > 0 ? 'Forward' : 
                 detectionResults.facesLookingAway > 0 ? 'Away' : 'Unknown'}
              </strong>
            </div>
          </div>
          
          {detectionResults.suspiciousActivities && detectionResults.suspiciousActivities.length > 0 && (
            <div className="suspicious-alerts">
              {detectionResults.suspiciousActivities.map((activity, index) => (
                <div key={index} className="suspicious-alert">
                  ⚠️ {activity}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// TextArea Component
const TextAreaAnswer = React.memo(({ questionIndex, value, onChange, disabled, rows }) => {
  return (
    <textarea
      className="answer-textarea"
      value={value || ''}
      onChange={(e) => onChange(questionIndex, e.target.value)}
      placeholder="Type your answer here..."
      rows={rows}
      disabled={disabled}
    />
  );
});

// QuestionCard Component
const QuestionCard = React.memo(({ 
  question, 
  index, 
  answer, 
  onAnswerChange, 
  showResults,
  isReviewMode 
}) => {
  const handleCheckboxChange = useCallback((option, isChecked) => {
    const currentAnswers = Array.isArray(answer) ? answer : [];
    const newAnswers = isChecked
      ? [...currentAnswers, option]
      : currentAnswers.filter(opt => opt !== option);
    onAnswerChange(index, newAnswers);
  }, [answer, index, onAnswerChange]);

  const handleRadioChange = useCallback((option) => {
    onAnswerChange(index, option);
  }, [index, onAnswerChange]);

  return (
    <div className="question-card">
      <div className="question-header">
        <h3>Question {index + 1}</h3>
        {question.points > 0 && (
          <span className="points-badge">{question.points} points</span>
        )}
      </div>
      
      <div className="question-content">
        <p className="question-text">{question.title}</p>
        
        {question.type === 'multiple-choice' && question.options && (
          <div className="options-list">
            {question.options.map((option, optIndex) => (
              <OptionLabel
                key={optIndex}
                type="radio"
                option={option}
                checked={answer === option}
                onChange={() => handleRadioChange(option)}
                disabled={showResults || isReviewMode}
                isReviewMode={isReviewMode}
              />
            ))}
          </div>
        )}
        
        {question.type === 'checkboxes' && question.options && (
          <div className="options-list">
            {question.options.map((option, optIndex) => (
              <OptionLabel
                key={optIndex}
                type="checkbox"
                option={option}
                checked={Array.isArray(answer) ? answer.includes(option) : false}
                onChange={(e) => handleCheckboxChange(option, e.target.checked)}
                disabled={showResults || isReviewMode}
                isReviewMode={isReviewMode}
              />
            ))}
          </div>
        )}
        
        {(question.type === 'short-answer' || question.type === 'paragraph') && (
          <TextAreaAnswer
            questionIndex={index}
            value={answer}
            onChange={onAnswerChange}
            disabled={showResults || isReviewMode}
            rows={question.type === 'paragraph' ? 4 : 2}
          />
        )}
      </div>
    </div>
  );
});

// OptionLabel Component
const OptionLabel = React.memo(({ type, option, checked, onChange, disabled, isReviewMode }) => (
  <label className={`option-label ${isReviewMode ? 'review-mode' : ''}`}>
    <input
      type={type}
      value={option}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
    />
    <span className="option-text">{option}</span>
  </label>
));

// Main Student Quiz Page Component
export default function StudentQuizPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { examTitle, classId, className } = location.state || {};
  
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  
  // Proctoring states
  const [proctoringActive, setProctoringActive] = useState(true);
  const [violations, setViolations] = useState([]);
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const [currentViolation, setCurrentViolation] = useState('');
  
  // Timer states
  const [timeLeft, setTimeLeft] = useState(null);
  const [totalTime, setTotalTime] = useState(null);
  const timerRef = useRef(null);

 // Sa StudentQuizPage.jsx, palitan ang loadQuiz function:
const loadQuiz = useCallback(async () => {
  try {
    setLoading(true);
    console.log('🔄 Loading quiz with examId:', examId);
    
    const response = await getQuizForStudent(examId);
    console.log('📊 Quiz API Response:', response);
    
    if (response.success) {
      setQuiz(response.data);
      
      // Check if exam session is active
      if (!response.data.isActive) {
        setError('Exam session has not started yet. Please wait for the teacher to begin the exam.');
        return;
      }
      
      // Initialize timer
      if (response.data.timeLimit) {
        setTotalTime(response.data.timeLimit * 60);
        setTimeLeft(response.data.timeLimit * 60);
      }
      
      // Initialize answers
      const initialAnswers = {};
      response.data.questions.forEach((question, index) => {
        initialAnswers[index] = question.type === 'checkboxes' ? [] : '';
      });
      setAnswers(initialAnswers);
      
    } else {
      setError(response.message || 'Failed to load quiz');
    }
  } catch (error) {
    console.error('Failed to load quiz:', error);
    setError('Failed to load quiz: ' + error.message);
  } finally {
    setLoading(false);
  }
}, [examId]);

  // Timer effect
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || showResults || isReviewMode) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timeLeft, showResults, isReviewMode]);

  const handleAutoSubmit = async () => {
    if (submitting || showResults) return;
    
    alert('Time is up! Submitting your quiz automatically.');
    await handleSubmit();
  };

  // Proctoring violation handler
  const handleProctoringViolation = useCallback((violationType, message) => {
    console.log('🚨 Proctoring violation:', violationType, message);
    
    setViolations(prev => [...prev, {
      type: violationType,
      message: message,
      timestamp: new Date().toISOString()
    }]);
    
    setCurrentViolation(message);
    setShowViolationWarning(true);
    
    // Auto-hide warning after 5 seconds
    setTimeout(() => {
      setShowViolationWarning(false);
    }, 5000);
  }, []);

  // Stable callback para sa answer changes
  const handleAnswerChange = useCallback((questionIndex, value) => {
    if (isReviewMode) return;
    
    setAnswers(prev => {
      if (prev[questionIndex] === value) {
        return prev;
      }
      return {
        ...prev,
        [questionIndex]: value
      };
    });
  }, [isReviewMode]);

  // Stable answered count calculation
  const { answeredCount, progressPercentage } = useMemo(() => {
    const count = Object.values(answers).filter(answer => 
      answer && (typeof answer === 'string' ? answer.trim() !== '' : Array.isArray(answer) ? answer.length > 0 : true)
    ).length;
    
    const percentage = (count / (quiz?.questions?.length || 1)) * 100;
    
    return { answeredCount: count, progressPercentage: percentage };
  }, [answers, quiz?.questions?.length]);

  const handleSubmit = async () => {
    if (!window.confirm('Are you sure you want to submit your answers? You cannot change them after submission.')) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await submitQuizAnswers(examId, answers);
      
      if (response.success) {
        setResults(response.data);
        setShowResults(true);
        setIsReviewMode(true);
        setProctoringActive(false); // Stop proctoring after submission
      } else {
        alert('Failed to submit quiz: ' + response.message);
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit quiz: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleReviewAnswers = () => {
    setIsReviewMode(true);
    setShowResults(false);
  };

  const handleBackToResults = () => {
    setIsReviewMode(false);
    setShowResults(true);
  };

  // Format time for display
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Results View Component
  const ResultsView = useMemo(() => {
    if (!results) return null;

    return (
      <div className="results-container">
        <div className="results-header">
          <div className="results-success">
            <div className="success-icon">✅</div>
            <h1>Quiz Submitted Successfully!</h1>
          </div>
          
          <div className="score-card">
            <div className="score-circle">
              <span className="score-percentage">
                {results.score !== undefined ? `${Math.round(results.score)}%` : 'N/A'}
              </span>
              <span className="score-label">Overall Score</span>
            </div>
            <div className="score-details">
              <div className="score-item">
                <span className="score-item-label">Correct Answers:</span>
                <span className="score-item-value">
                  {results.correctAnswers !== undefined ? results.correctAnswers : 'N/A'} / {quiz?.questions?.length || 0}
                </span>
              </div>
              <div className="score-item">
                <span className="score-item-label">Total Points:</span>
                <span className="score-item-value">
                  {results.totalPoints !== undefined ? results.totalPoints : 'N/A'} / {quiz?.totalPoints || 'N/A'}
                </span>
              </div>
              <div className="score-item">
                <span className="score-item-label">Submitted At:</span>
                <span className="score-item-value">{new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="performance-message">
          <div className="message">
            <h3>
              {results.score >= 90 ? 'Excellent Work! 🎉' : 
               results.score >= 75 ? 'Good Job! 👍' : 
               results.score >= 60 ? 'Not Bad! 💪' : 
               'Keep Practicing! 📚'}
            </h3>
            <p>
              {results.score >= 90 ? 'You have mastered this material!' : 
               results.score >= 75 ? 'You have a good understanding of the topic.' : 
               results.score >= 60 ? 'You passed, but there is room for improvement.' : 
               'Review the material and try again.'}
            </p>
          </div>
        </div>

        <div className="results-actions">
          <button 
            className="action-btn back-to-class-btn"
            onClick={handleBackToDashboard}
          >
            ← Back to Dashboard
          </button>
          <button 
            className="action-btn view-answers-btn"
            onClick={handleReviewAnswers}
          >
            📝 Review Your Answers
          </button>
        </div>
      </div>
    );
  }, [results, quiz, handleBackToDashboard, handleReviewAnswers]);

  // Quiz View Component with Proctoring
  const QuizView = useMemo(() => {
    const isDisabled = showResults || isReviewMode || submitting;

    return (
      <div className="student-quiz-container with-proctoring">
        {/* Header with Class Info and Timer */}
        <div className="quiz-header">
          <div className="header-left">
            {isReviewMode ? (
              <button 
                className="back-btn"
                onClick={handleBackToResults}
              >
                ← Back to Results
              </button>
            ) : (
              <button 
                className="back-btn"
                onClick={handleBackToDashboard}
              >
                ← Back to Dashboard
              </button>
            )}
            
            <div className="class-info">
              <h2>{className || 'Class'}</h2>
              <span className="exam-title">{quiz?.title || examTitle}</span>
            </div>
          </div>

          {/* Timer Display */}
          {timeLeft !== null && (
            <div className="timer-container">
              <div className="timer">
                <span className="timer-icon">⏰</span>
                <span className="timer-text">{formatTime(timeLeft)}</span>
              </div>
              {timeLeft < 300 && ( // Warning when less than 5 minutes
                <div className="time-warning">
                  ⚠️ {Math.ceil(timeLeft / 60)} minutes remaining
                </div>
              )}
            </div>
          )}

          <div className="quiz-meta">
            <span>{quiz?.questions?.length || 0} questions</span>
            {quiz?.totalPoints > 0 && (
              <span>Total points: {quiz.totalPoints}</span>
            )}
            {isReviewMode && (
              <span className="review-badge">Review Mode</span>
            )}
          </div>
        </div>

        {/* Violation Warning */}
        {showViolationWarning && (
          <div className="violation-warning">
            <div className="warning-content">
              <span className="warning-icon">⚠️</span>
              <span className="warning-text">{currentViolation}</span>
            </div>
          </div>
        )}

        <div className="quiz-layout">
          {/* Main Quiz Content */}
          <div className="quiz-questions-section">
            <div className="quiz-questions">
              {quiz?.questions?.map((question, index) => (
                <QuestionCard
                  key={index}
                  question={question}
                  index={index}
                  answer={answers[index]}
                  onAnswerChange={handleAnswerChange}
                  showResults={showResults}
                  isReviewMode={isReviewMode}
                />
              ))}
            </div>

            {!isReviewMode && (
              <div className="quiz-footer">
                <div className="quiz-progress">
                  <span className="progress-text">
                    Answered: {answeredCount} / {quiz?.questions?.length || 0}
                  </span>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>
                
                <button 
                  className="submit-quiz-btn"
                  onClick={handleSubmit}
                  disabled={isDisabled || !quiz?.questions?.length}
                >
                  {submitting ? (
                    <>
                      <div className="loading-spinner-small"></div>
                      Submitting...
                    </>
                  ) : (
                    'Submit Quiz'
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Proctoring Sidebar */}
          <div className="proctoring-sidebar">
            <ProctoringMonitor 
              isActive={proctoringActive && !isReviewMode}
              onViolation={handleProctoringViolation}
            />
            
            {/* Violations Log */}
            {violations.length > 0 && (
              <div className="violations-log">
                <h4>Proctoring Log</h4>
                <div className="violations-list">
                  {violations.slice(-5).map((violation, index) => (
                    <div key={index} className="violation-item">
                      <span className="violation-time">
                        {new Date(violation.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="violation-message">{violation.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {isReviewMode && (
          <div className="quiz-footer">
            <div className="quiz-progress">
              <span className="progress-text">
                Reviewing your submitted answers
              </span>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: '100%', backgroundColor: '#48bb78' }}
                ></div>
              </div>
            </div>
            
            <button 
              className="action-btn back-to-class-btn"
              onClick={handleBackToDashboard}
            >
              ← Back to Dashboard
            </button>
          </div>
        )}
      </div>
    );
  }, [
    quiz, examTitle, className, answers, answeredCount, progressPercentage, 
    showResults, isReviewMode, submitting, timeLeft, violations, 
    showViolationWarning, currentViolation, handleAnswerChange, 
    handleSubmit, handleBackToDashboard, handleBackToResults, 
    handleProctoringViolation
  ]);

  if (loading) {
    return (
      <div className="quiz-loading">
        <div className="loading-spinner"></div>
        <p>Loading quiz...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="quiz-error">
        <h2>Error Loading Quiz</h2>
        <p>{error}</p>
        <button 
          onClick={handleBackToDashboard}
          className="back-btn"
        >
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="quiz-error">
        <h2>Quiz Not Found</h2>
        <p>The requested quiz could not be found.</p>
        <button 
          onClick={handleBackToDashboard}
          className="back-btn"
        >
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  return showResults ? ResultsView : QuizView;
}