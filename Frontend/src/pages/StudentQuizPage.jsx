// StudentQuizPage.jsx - FIXED CAMERA SHARING VERSION
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { getQuizForStudent, submitQuizAnswers } from '../lib/api';
import './StudentQuizPage.css';

// Simplified Camera Component without detection
const CameraComponent = React.memo(({ 
  requiresCamera, 
  onCameraStateChange,
  onProctoringAlert 
}) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraState, setCameraState] = useState({
    isConnected: false,
    isInitializing: false,
    error: '',
    hasCamera: false
  });
  const [camOn, setCamOn] = useState(true);

  const initializeCamera = useCallback(async () => {
    if (!requiresCamera) return;

    try {
      setCameraState(prev => ({ ...prev, isInitializing: true, error: '' }));

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera not supported');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 }, 
          facingMode: 'user',
          frameRate: { ideal: 15, max: 30 }
        },
        audio: false
      });
      
      streamRef.current = stream;

      if (!videoRef.current) {
        throw new Error('Video element not available');
      }

      const videoElement = videoRef.current;
      videoElement.srcObject = stream;

      await videoElement.play();

      setCameraState(prev => ({
        ...prev,
        isConnected: true,
        isInitializing: false,
        hasCamera: true,
        error: ''
      }));
      
      onCameraStateChange?.(true);

    } catch (error) {
      console.error('Camera initialization failed:', error);
      
      let userMessage = 'Camera access failed';
      if (error.name === 'NotAllowedError') userMessage = 'Camera permission denied';
      else if (error.name === 'NotFoundError') userMessage = 'No camera found';
      else if (error.name === 'NotReadableError') userMessage = 'Camera is busy';
      
      setCameraState(prev => ({
        ...prev,
        isConnected: false,
        isInitializing: false,
        error: userMessage
      }));
      onCameraStateChange?.(false);
    }
  }, [requiresCamera, onCameraStateChange]);

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

        if (cameras.length > 0 && mounted) {
          await initializeCamera();
        } else if (mounted) {
          setCameraState(prev => ({ 
            ...prev, 
            error: 'No camera found', 
            isInitializing: false 
          }));
        }
      } catch (error) {
        if (mounted) {
          setCameraState(prev => ({ 
            ...prev, 
            error: 'Camera setup failed', 
            isInitializing: false 
          }));
        }
      }
    };

    initCamera();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
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

  const retryCamera = async () => {
    setCameraState(prev => ({ ...prev, error: '', isInitializing: true }));
    await initializeCamera();
  };

  if (!requiresCamera) return null;

  return (
    <div className="camera-section">
      <div className="camera-header">
        <div className="user-info">
          <span className="user-name">Student</span>
          <span className={`detection-status ${cameraState.isConnected ? 'normal' : 'bad'}`}>
            {cameraState.isConnected ? 'Camera Active' : 'Camera Off'}
          </span>
        </div>
        <div className="camera-controls-mini">
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
          style={{ 
            display: (cameraState.isConnected && camOn) ? 'block' : 'none'
          }}
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
        ) : null}
      </div>

      {cameraState.error && (
        <div className="camera-error-footer">
          <button className="retry-btn" onClick={retryCamera}>🔄 Retry Camera</button>
          <span className="error-message">{cameraState.error}</span>
        </div>
      )}
    </div>
  );
});

// Header Alerts Component
const HeaderAlerts = React.memo(({ alerts }) => {
  if (alerts.length === 0) return null;

  const latestAlerts = alerts.slice(0, 2);

  return (
    <div className="header-alerts">
      {latestAlerts.map((alert) => (
        <div key={alert.id} className={`alert-text ${alert.type || 'warning'}`}>
          {alert.message}
        </div>
      ))}
    </div>
  );
});

// MAIN COMPONENT - FIXED CAMERA SHARING
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
  const [timeRemaining, setTimeRemaining] = useState(null);

  // ✅ FIXED STATES FOR WEBCAM SHARING
  const socketRef = useRef(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [cameraRequested, setCameraRequested] = useState(false);
  const [isSharingCamera, setIsSharingCamera] = useState(false);
  const [teacherSocketId, setTeacherSocketId] = useState(null);

  // ✅ FIXED: Initialize Socket.io with useRef
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('❌ No token available for socket connection');
      return;
    }

    console.log('🔑 Connecting student socket...');

    const newSocket = io('http://localhost:3000', {
      auth: { 
        token: token 
      },
      query: { 
        examId: examId,
        userRole: 'student' 
      },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('✅ Student Socket connected successfully');
      
      // Join exam room after connection
      newSocket.emit('join-exam-room', {
        roomId: `exam-${examId}`,
        userName: 'Student',
        userId: 'student-user',
        userRole: 'student'
      });
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Student Socket connection failed:', error);
    });

    // ✅ FIXED: Socket event listeners
    newSocket.on('camera-request', handleCameraRequest);
    newSocket.on('webrtc-answer', handleWebRTCAnswer);
    newSocket.on('ice-candidate', handleICECandidate);

    // Store socket in ref for reliable access
    socketRef.current = newSocket;

    return () => {
      console.log('🛑 Cleaning up student socket');
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (peerConnection) {
        peerConnection.close();
      }
    };
  }, [examId]);

// ✅ FIXED: PREVENT MULTIPLE CAMERA RESPONSES
const handleCameraRequest = async (data) => {
  // ✅ PREVENT DUPLICATE PROCESSING
  if (isSharingCamera && teacherSocketId === data.from) {
    console.log('📹 Already sharing camera with this teacher');
    return;
  }
  
  console.log('📹 Camera request from teacher:', data);
  setCameraRequested(true);
  setTeacherSocketId(data.from);
  
  try {
    // Stop existing stream if any
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (peerConnection) {
      peerConnection.close();
    }

    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 640 }, 
        height: { ideal: 480 },
        facingMode: 'user'
      }, 
      audio: false 
    });
    
    console.log('🎥 Camera accessed successfully');
    
    setLocalStream(stream);
    setIsSharingCamera(true);
    setCameraActive(true);

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });

    // Add tracks
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', {
          target: data.from,
          candidate: event.candidate
        });
      }
    };

    // Create and send offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    if (socketRef.current) {
      socketRef.current.emit('webrtc-offer', {
        target: data.from,
        offer: offer
      });
      console.log('✅ Sent WebRTC offer to teacher');
      setPeerConnection(pc);
    }

  } catch (error) {
    console.error('❌ Error accessing camera:', error);
    setIsSharingCamera(false);
    setCameraActive(false);
  }
};

  // ✅ FIXED: Handle WebRTC answer from teacher
  const handleWebRTCAnswer = async (data) => {
    if (peerConnection) {
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        console.log('✅ Set remote description from teacher answer');
      } catch (error) {
        console.error('❌ Error setting remote description:', error);
      }
    }
  };

  // ✅ FIXED: Handle ICE candidate from teacher
  const handleICECandidate = async (data) => {
    if (peerConnection && data.candidate) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        console.log('✅ Added ICE candidate from teacher');
      } catch (error) {
        console.error('❌ Error adding ICE candidate:', error);
      }
    }
  };

  // Load quiz data
  const loadQuiz = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getQuizForStudent(examId);
      
      if (response.success) {
        setQuiz(response.data);
        
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

        if (response.data.duration) {
          setTimeRemaining(response.data.duration * 60);
        }
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

  const handleCameraStateChange = useCallback((isActive) => {
    setCameraActive(isActive);
    if (!isActive && requiresCamera) {
      setProctoringAlerts(prev => [{
        id: Date.now(),
        message: '⚠️ Camera disconnected - Monitoring paused',
        timestamp: new Date().toLocaleTimeString(),
        type: 'warning'
      }, ...prev.slice(0, 4)]);
    }
  }, [requiresCamera]);

  const handleProctoringAlert = useCallback((alertData) => {
    setProctoringAlerts(prev => {
      if (prev.some(a => a.message === alertData.message)) return prev;
      
      const newAlert = {
        id: Date.now(),
        message: alertData.message,
        timestamp: new Date().toLocaleTimeString(),
        type: alertData.type || 'warning'
      };
      
      return [newAlert, ...prev.slice(0, 4)];
    });
  }, []);

  const handleAnswerChange = useCallback((questionIndex, value) => {
    setAnswers(prev => {
      const newAnswers = { ...prev, [questionIndex]: value };
      
      const count = Object.values(newAnswers).filter(answer => 
        answer && (typeof answer === 'string' ? answer.trim() !== '' : Array.isArray(answer) ? answer.length > 0 : true)
      ).length;
      setAnsweredCount(count);
      
      return newAnswers;
    });
  }, []);

  const handleCheckboxChange = useCallback((questionIndex, option, isChecked) => {
    const currentAnswers = Array.isArray(answers[questionIndex]) ? answers[questionIndex] : [];
    const newAnswers = isChecked
      ? [...currentAnswers, option]
      : currentAnswers.filter(opt => opt !== option);
    handleAnswerChange(questionIndex, newAnswers);
  }, [answers, handleAnswerChange]);

  const handleSubmitQuiz = async () => {
    if (!window.confirm('Are you sure you want to submit your answers?')) return;
    
    if (requiresCamera && !cameraActive) {
      const proceed = window.confirm(
        'Camera monitoring is not active. This may be reported to your instructor. Continue with submission?'
      );
      if (!proceed) return;
    }

    setSubmitting(true);
    try {
      const submissionResponse = await submitQuizAnswers(examId, answers);
      
      if (submissionResponse.success) {
        alert('✅ Answers submitted successfully!');
        
        // Stop camera sharing
        if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
        }
        if (peerConnection) {
          peerConnection.close();
        }
        
        navigate('/dashboard');
      } else {
        throw new Error(submissionResponse.message || 'Submission failed');
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('❌ Failed to submit answers. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
        {requiresCamera && <small>📹 Camera access required for this exam</small>}
      </div>
    );
  }

  if (error) {
    return (
      <div className="quiz-error">
        <h2>❌ Error Loading Quiz</h2>
        <p>{error}</p>
        <div className="error-actions">
          <button onClick={loadQuiz} className="retry-btn">
            🔄 Try Again
          </button>
          <button onClick={() => navigate('/dashboard')} className="back-btn">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="quiz-error">
        <h2>❌ Quiz Not Found</h2>
        <p>The quiz you're trying to access is not available or has been removed.</p>
        <button onClick={() => navigate('/dashboard')} className="back-btn">
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  const progressPercentage = (answeredCount / (quiz.questions?.length || 1)) * 100;

  return (
    <div className={`student-quiz-container ${requiresCamera ? 'exam-mode' : 'quiz-mode'}`}>
      
      <HeaderAlerts alerts={proctoringAlerts} />

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
              {timeRemaining !== null && (
                <span className="timer">Time: {formatTime(timeRemaining)}</span>
              )}
            </div>
          </div>
        </div>
        
        {requiresCamera && (
          <div className="camera-status-header">
            <span className={`camera-indicator ${cameraActive ? 'active' : 'inactive'}`}>
              {cameraActive ? '📹 Live Monitoring' : '📹 Camera Off'}
            </span>
            {isSharingCamera && (
              <span className="sharing-indicator">
                🔄 Sharing with Teacher
              </span>
            )}
            {proctoringAlerts.length > 0 && (
              <span className="alert-count">
                Alerts: {proctoringAlerts.length}
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Camera Sharing Status Indicator */}
      {cameraRequested && (
        <div className="camera-sharing-status">
          <div className={`sharing-indicator ${isSharingCamera ? 'active' : 'denied'}`}>
            <span className="sharing-icon">
              {isSharingCamera ? '📹' : '📹❌'}
            </span>
            <span className="sharing-text">
              {isSharingCamera ? 'Camera shared with teacher' : 'Camera access denied'}
            </span>
          </div>
        </div>
      )}

      <div className="quiz-progress">
        <div className="progress-info">
          <span className="progress-text">
            Answered: {answeredCount} / {quiz.questions?.length || 0}
          </span>
          {timeRemaining !== null && (
            <span className="time-remaining">
              Time Left: {formatTime(timeRemaining)}
            </span>
          )}
        </div>
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
                <div className="question-meta">
                  {question.points > 0 && (
                    <span className="points-badge">{question.points} points</span>
                  )}
                  <span className="question-type">{question.type}</span>
                </div>
              </div>
              <div className="question-content">
                <p className="question-text">{question.title}</p>
                
                {question.description && (
                  <p className="question-description">{question.description}</p>
                )}
                
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
                    placeholder={question.type === 'short-answer' ? "Type your short answer here..." : "Type your detailed answer here..."}
                    rows={question.type === 'paragraph' ? 4 : 2}
                    value={answers[index] || ''}
                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                  />
                )}
                
                {question.type === 'true-false' && (
                  <div className="options-list">
                    <label className="option-label">
                      <input 
                        type="radio" 
                        name={`question-${index}`} 
                        value="true"
                        onChange={(e) => handleAnswerChange(index, e.target.value)}
                        checked={answers[index] === 'true'}
                      />
                      <span className="option-text">True</span>
                    </label>
                    <label className="option-label">
                      <input 
                        type="radio" 
                        name={`question-${index}`} 
                        value="false"
                        onChange={(e) => handleAnswerChange(index, e.target.value)}
                        checked={answers[index] === 'false'}
                      />
                      <span className="option-text">False</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="quiz-footer">
          <div className="footer-info">
            <span className="answered-count">
              {answeredCount} of {quiz.questions?.length || 0} questions answered
            </span>
            {timeRemaining !== null && timeRemaining < 300 && (
              <span className="time-warning">
                ⚠️ {formatTime(timeRemaining)} remaining
              </span>
            )}
          </div>
          <button 
            className={`submit-quiz-btn ${answeredCount === 0 ? 'disabled' : ''}`}
            onClick={handleSubmitQuiz}
            disabled={submitting || answeredCount === 0}
          >
            {submitting ? (
              <>
                <div className="loading-spinner-small"></div>
                Submitting...
              </>
            ) : (
              `Submit Quiz ${answeredCount > 0 ? `(${answeredCount} answers)` : ''}`
            )}
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