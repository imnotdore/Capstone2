// src/components/StudentQuizPage.jsx - FIXED WITH ERROR HANDLING
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getQuizForStudent } from '../lib/api';
import './StudentQuizPage.css';

// OPTIMIZED CAMERA COMPONENT
const CameraComponent = React.memo(({ 
  requiresCamera, 
  onCameraStateChange,
  onProctoringAlert 
}) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const [cameraState, setCameraState] = useState({
    isConnected: false,
    isInitializing: false,
    error: '',
    hasCamera: false
  });
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(false);
  const [detections, setDetections] = useState({
    face: false,
    eyes: false,
    status: 'Initializing...',
    faceCount: 0,
    lookingAway: false
  });

  const PYTHON_BACKEND = 'http://localhost:5000';

  // Optimized detection function
// In the captureAndDetect function, update the fetch call:
const captureAndDetect = useCallback(async () => {
  if (!videoRef.current || !camOn || !cameraState.isConnected || videoRef.current.readyState < 2) {
    return;
  }

  try {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!canvas || video.videoWidth === 0 || video.videoHeight === 0) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.7);
    
    // FIXED: Use the correct endpoint
    const response = await fetch(`${PYTHON_BACKEND}/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageData })
    });

    if (!response.ok) {
      console.error('Detection request failed:', response.status);
      return;
    }

    const result = await response.json();
    
    // Update detections with the correct field names from your Python backend
    const newDetections = {
      face: result.faceDetected,
      eyes: result.eyeDetected,
      status: result.suspiciousActivities?.length > 0 ? result.suspiciousActivities[0] : 'Normal',
      faceCount: result.faceCount || 0,
      lookingAway: !result.gazeForward  // Convert gazeForward to lookingAway
    };

    setDetections(newDetections);

    // Only send new alerts
    if (result.suspiciousActivities?.length > 0) {
      result.suspiciousActivities.forEach(alert => {
        onProctoringAlert?.(alert);
      });
    }

  } catch (error) {
    console.error('Detection error:', error);
  }
}, [camOn, cameraState.isConnected, onProctoringAlert]);

  const initializeCamera = useCallback(async () => {
    if (!requiresCamera) return;

    try {
      setCameraState(prev => ({ ...prev, isInitializing: true, error: '' }));

      // Wait for video element
      let attempts = 0;
      while (!videoRef.current && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!videoRef.current) throw new Error('Video element not available');
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera not supported');

      // Cleanup existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });
      
      streamRef.current = stream;

      if (!videoRef.current) throw new Error('Video element lost');

      // Setup video element
      const videoElement = videoRef.current;
      videoElement.srcObject = stream;
      
      await new Promise((resolve, reject) => {
        const onLoaded = () => {
          videoElement.removeEventListener('loadedmetadata', onLoaded);
          videoElement.removeEventListener('error', onError);
          resolve();
        };

        const onError = () => {
          videoElement.removeEventListener('loadedmetadata', onLoaded);
          videoElement.removeEventListener('error', onError);
          reject(new Error('Video failed to load'));
        };

        videoElement.addEventListener('loadedmetadata', onLoaded);
        videoElement.addEventListener('error', onError);

        setTimeout(() => reject(new Error('Video loading timeout')), 5000);
      });

      await videoElement.play();

      setCameraState(prev => ({
        ...prev,
        isConnected: true,
        isInitializing: false,
        hasCamera: true,
        error: ''
      }));
      onCameraStateChange?.(true);

      // Start detection with optimized interval
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      detectionIntervalRef.current = setInterval(captureAndDetect, 3000);

    } catch (error) {
      console.error('Camera initialization failed:', error);
      
      let userMessage = 'Camera access failed';
      if (error.name === 'NotAllowedError') userMessage = 'Camera permission denied';
      else if (error.name === 'NotFoundError') userMessage = 'No camera found';
      
      setCameraState(prev => ({
        ...prev,
        isConnected: false,
        isInitializing: false,
        error: userMessage
      }));
      onCameraStateChange?.(false);
    }
  }, [requiresCamera, onCameraStateChange, captureAndDetect]);

  useEffect(() => {
    if (!requiresCamera) return;

    let mounted = true;

    const initCamera = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');
        
        if (mounted) {
          setCameraState(prev => ({ ...prev, hasCamera: cameras.length > 0 }));
        }

        if (cameras.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 300));
          if (mounted) await initializeCamera();
        }
      } catch (error) {
        if (mounted) {
          setCameraState(prev => ({ ...prev, error: 'Camera setup failed', isInitializing: false }));
        }
      }
    };

    const timer = setTimeout(initCamera, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [requiresCamera, initializeCamera]);

  const toggleCam = () => {
    if (!streamRef.current) return;
    
    const videoTracks = streamRef.current.getVideoTracks();
    if (videoTracks.length > 0) {
      const newCamState = !camOn;
      videoTracks[0].enabled = newCamState;
      setCamOn(newCamState);
      onCameraStateChange?.(newCamState);
    }
  };

  const toggleMic = () => {
    setMicOn(!micOn);
  };

  const retryCamera = async () => {
    setCameraState(prev => ({ ...prev, error: '', isInitializing: true }));
    await new Promise(resolve => setTimeout(resolve, 500));
    await initializeCamera();
  };

  if (!requiresCamera) return null;

  return (
    <div className="camera-section">
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      <div className="camera-header">
        <div className="user-info">
          <span className="user-name">Student</span>
          <span className={`detection-status ${detections.status === 'Normal' ? 'normal' : 'warning'}`}>
            {detections.status}
          </span>
        </div>
        <div className="camera-controls-mini">
          <button className={`control-icon ${micOn ? 'active' : ''}`} onClick={toggleMic}>
            {micOn ? '🎤' : '🎤❌'}
          </button>
          <button 
            className={`control-icon ${camOn ? 'active' : ''}`}
            onClick={toggleCam}
            disabled={cameraState.isInitializing || !cameraState.isConnected}
          >
            {camOn ? '📹' : '📹❌'}
          </button>
        </div>
      </div>
      
      <div className="camera-preview">
        <video 
          ref={videoRef}
          autoPlay 
          muted 
          playsInline
          className="camera-video"
          style={{ display: (cameraState.isConnected && camOn) ? 'block' : 'none' }}
        />
        
        {(!cameraState.isConnected || !camOn) ? (
          <div className="camera-offline">
            <div className="offline-icon">📹</div>
            <p>{cameraState.error || 'Camera is off'}</p>
            {cameraState.isInitializing && (
              <div className="initializing-message">
                <div className="loading-spinner-small"></div>
                <span>Starting camera...</span>
              </div>
            )}
          </div>
        ) : (
          <div className="detection-overlay">
            <div className="detection-indicators">
              <div className={`detection-indicator ${detections.face ? 'good' : 'bad'}`}>
                {detections.face ? '👤' : '👤❌'}
                <span className="indicator-count">{detections.faceCount}</span>
              </div>
              <div className={`detection-indicator ${detections.eyes ? 'good' : 'bad'}`}>
                {detections.eyes ? '👀' : '👀❌'}
              </div>
              <div className={`detection-indicator ${!detections.lookingAway ? 'good' : 'bad'}`}>
                {detections.lookingAway ? '👁️❌' : '👁️'}
              </div>
            </div>
          </div>
        )}
      </div>

      {cameraState.isConnected && camOn && (
        <div className="detection-status-bar">
          <div className="status-item">
            <span>Face:</span>
            <span className={detections.face ? 'status-good' : 'status-bad'}>
              {detections.face ? `Detected (${detections.faceCount})` : 'Not found'}
            </span>
          </div>
          <div className="status-item">
            <span>Eyes:</span>
            <span className={detections.eyes ? 'status-good' : 'status-bad'}>
              {detections.eyes ? 'Visible' : 'Not visible'}
            </span>
          </div>
          <div className="status-item">
            <span>Gaze:</span>
            <span className={!detections.lookingAway ? 'status-good' : 'status-bad'}>
              {detections.lookingAway ? 'Looking away' : 'Forward'}
            </span>
          </div>
        </div>
      )}

      {cameraState.error && (
        <div className="camera-error-footer">
          <button className="retry-btn" onClick={retryCamera}>🔄 Retry</button>
          <span className="error-message">{cameraState.error}</span>
        </div>
      )}
    </div>
  );
});

// MAIN COMPONENT - FIXED WITH ERROR HANDLING
export default function StudentQuizPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { 
    requiresCamera = false,
    examTitle = 'Quiz',
    className = 'Class'
  } = location.state || {};

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [proctoringAlerts, setProctoringAlerts] = useState([]);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [error, setError] = useState('');

  const loadQuiz = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getQuizForStudent(examId);
      
      if (response.success) {
        setQuiz(response.data);
        // Initialize answers based on question types
        const initialAnswers = {};
        if (response.data.questions) {
          response.data.questions.forEach((question, index) => {
            if (question.type === 'checkboxes') {
              initialAnswers[index] = [];
            } else {
              initialAnswers[index] = '';
            }
          });
        }
        setAnswers(initialAnswers);
      } else {
        setError(response.message || 'Failed to load quiz');
      }
    } catch (error) {
      console.error('Error loading quiz:', error);
      setError('Error loading quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [examId]);

  const handleCameraStateChange = (isActive) => {
    setCameraActive(isActive);
    if (!isActive && requiresCamera) {
      setProctoringAlerts(prev => [{
        id: Date.now(),
        message: '⚠️ Camera disconnected',
        timestamp: new Date().toLocaleTimeString(),
        type: 'warning'
      }, ...prev.slice(0, 4)]);
    }
  };

  const handleProctoringAlert = useCallback((alert) => {
    setProctoringAlerts(prev => {
      if (prev.some(a => a.message === alert)) return prev;
      
      return [{
        id: Date.now(),
        message: alert,
        timestamp: new Date().toLocaleTimeString(),
        type: 'warning'
      }, ...prev.slice(0, 4)];
    });
  }, []);

  const handleAnswerChange = (questionIndex, value) => {
    setAnswers(prev => {
      const newAnswers = { ...prev, [questionIndex]: value };
      
      // Update answered count
      const count = Object.values(newAnswers).filter(answer => 
        answer && (typeof answer === 'string' ? answer.trim() !== '' : Array.isArray(answer) ? answer.length > 0 : true)
      ).length;
      setAnsweredCount(count);
      
      return newAnswers;
    });
  };

  const handleCheckboxChange = (questionIndex, option, isChecked) => {
    const currentAnswers = Array.isArray(answers[questionIndex]) ? answers[questionIndex] : [];
    const newAnswers = isChecked
      ? [...currentAnswers, option]
      : currentAnswers.filter(opt => opt !== option);
    handleAnswerChange(questionIndex, newAnswers);
  };

  const handleSubmitQuiz = async () => {
    if (!window.confirm('Are you sure you want to submit your answers?')) return;
    if (requiresCamera && !cameraActive) {
      if (!window.confirm('Camera is not active. Submit without monitoring?')) return;
    }

    setSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('✅ Answers submitted successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit answers. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (examId) {
      loadQuiz();
    }
  }, [examId, loadQuiz]);

  if (loading) {
    return (
      <div className="quiz-loading">
        <div className="loading-spinner"></div>
        <p>Loading quiz...</p>
        {requiresCamera && <small>📹 Camera access required</small>}
      </div>
    );
  }

  if (error) {
    return (
      <div className="quiz-error">
        <h2>❌ Error Loading Quiz</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/dashboard')} className="back-btn">
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="quiz-error">
        <h2>❌ Quiz Not Found</h2>
        <p>The quiz you're trying to access is not available.</p>
        <button onClick={() => navigate('/dashboard')} className="back-btn">
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  const progressPercentage = (answeredCount / (quiz.questions?.length || 1)) * 100;

  return (
    <div className={`student-quiz-container ${requiresCamera ? 'exam-mode' : 'quiz-mode'}`}>
      <div className="quiz-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </button>
          <div className="quiz-info">
            <h1>{quiz.title || examTitle}</h1>
            <p className="class-info">Class: {className}</p>
            <div className="quiz-meta">
              <span>{quiz.questions?.length || 0} questions</span>
              {quiz.totalPoints > 0 && (
                <span>Total points: {quiz.totalPoints}</span>
              )}
            </div>
          </div>
        </div>
        
        {requiresCamera && (
          <div className="camera-status-header">
            <span className={`camera-indicator ${cameraActive ? 'active' : 'inactive'}`}>
              {cameraActive ? '📹 Monitoring' : '📹 Camera Off'}
            </span>
          </div>
        )}
      </div>
      
      {/* Progress Bar */}
      <div className="quiz-progress">
        <span className="progress-text">
          Answered: {answeredCount} / {quiz.questions?.length || 0}
        </span>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      <div className="quiz-content">
        <div className="quiz-questions">
          {quiz.questions?.map((question, index) => (
            <div key={`question-${examId}-${index}`} className="question-card">
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
                      <label key={`option-${index}-${optIndex}`} className="option-label">
                        <input 
                          type="radio" 
                          name={`question-${index}`} 
                          value={option}
                          onChange={(e) => handleAnswerChange(index, e.target.value)}
                          checked={answers[index] === option}
                        />
                        <span className="option-text">{option}</span>
                      </label>
                    ))}
                  </div>
                )}
                
                {question.type === 'checkboxes' && question.options && (
                  <div className="options-list">
                    {question.options.map((option, optIndex) => (
                      <label key={`option-${index}-${optIndex}`} className="option-label">
                        <input 
                          type="checkbox" 
                          value={option}
                          onChange={(e) => handleCheckboxChange(index, option, e.target.checked)}
                          checked={Array.isArray(answers[index]) ? answers[index].includes(option) : false}
                        />
                        <span className="option-text">{option}</span>
                      </label>
                    ))}
                  </div>
                )}
                
                {(question.type === 'short-answer' || question.type === 'paragraph') && (
                  <textarea
                    className="answer-textarea"
                    placeholder="Type your answer here..."
                    rows={question.type === 'paragraph' ? 4 : 2}
                    value={answers[index] || ''}
                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="quiz-footer">
          <button 
            className="submit-quiz-btn"
            onClick={handleSubmitQuiz}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Quiz'}
          </button>
        </div>
      </div>

      {requiresCamera && (
        <CameraComponent 
          requiresCamera={requiresCamera}
          onCameraStateChange={handleCameraStateChange}
          onProctoringAlert={handleProctoringAlert}
        />
      )}
    </div>
  );
}