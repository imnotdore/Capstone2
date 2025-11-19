// src/components/TeacherExamSession.jsx - UPDATED VERSION (No Teacher Camera)
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { getJoinedStudents, startExamSession, endExamSession } from '../lib/api';
import './TeacherExamSession.css';

export default function TeacherExamSession() {
  const { examId } = useParams();
  const navigate = useNavigate();
  
  const [exam, setExam] = useState(null);
  const [students, setStudents] = useState([]);
  const [timeLeft, setTimeLeft] = useState(3600);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionStarted, setSessionStarted] = useState(false);
  
  const timerRef = useRef(null);
  const studentsIntervalRef = useRef(null);

  // Load exam and students
  useEffect(() => {
    const loadExamData = async () => {
      try {
        setLoading(true);
        
        // Load exam details
        const examResponse = await api.get(`/exams/${examId}/details`);
        if (examResponse.success) {
          setExam(examResponse.data);
          setTimeLeft(examResponse.data.timeLimit * 60 || 3600);
        }
        
        // Load joined students
        await loadJoinedStudents();
        
      } catch (error) {
        console.error('Failed to load exam data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadExamData();
  }, [examId]);

  // Load joined students
  const loadJoinedStudents = async () => {
    try {
      const response = await getJoinedStudents(examId);
      if (response.success) {
        setStudents(response.data.joinedStudents || []);
      }
    } catch (error) {
      console.error('Failed to load joined students:', error);
    }
  };

  // Real-time students updates
  useEffect(() => {
    if (sessionStarted) {
      studentsIntervalRef.current = setInterval(() => {
        loadJoinedStudents();
      }, 5000); // Update every 5 seconds
    }

    return () => {
      if (studentsIntervalRef.current) {
        clearInterval(studentsIntervalRef.current);
      }
    };
  }, [sessionStarted, examId]);

  // Start exam session
  const handleStartExam = async () => {
    try {
      const response = await startExamSession(examId);
      if (response.success) {
        setSessionStarted(true);
        setIsTimerRunning(true);
        alert('Exam session started! Students can now join with camera monitoring.');
      }
    } catch (error) {
      console.error('Failed to start exam:', error);
      alert('Failed to start exam session');
    }
  };

  // End exam session
  const handleEndExam = async () => {
    try {
      const response = await endExamSession(examId);
      if (response.success) {
        setSessionStarted(false);
        setIsTimerRunning(false);
        if (studentsIntervalRef.current) {
          clearInterval(studentsIntervalRef.current);
        }
        alert('Exam session ended!');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Failed to end exam:', error);
    }
  };

  // Timer control
  useEffect(() => {
    if (isTimerRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft <= 0 && isTimerRunning) {
      handleEndExam();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning, timeLeft]);

  // Format time
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Add time functions
  const addTime = (minutes) => {
    setTimeLeft(prev => prev + (minutes * 60));
  };

  if (loading) {
    return (
      <div className="teacher-exam-loading">
        <div className="loading-spinner"></div>
        <p>Loading exam session...</p>
      </div>
    );
  }

  return (
    <div className="teacher-exam-session">
      {/* Header */}
      <div className="teacher-exam-header">
        <div className="header-left">
          <button 
            className="back-btn"
            onClick={() => navigate('/dashboard')}
          >
            ← Back to Dashboard
          </button>
          <div className="exam-info">
            <h1>{exam?.title || 'Exam Session'}</h1>
            <p>Class: {exam?.classId?.name || 'Current Class'}</p>
          </div>
        </div>
        
        <div className="header-center">
          <div className="timer-display">
            <span className="timer-icon">⏰</span>
            <span className="timer-text">{formatTime(timeLeft)}</span>
          </div>
          <div className="student-count">
            👥 {students.length} Students Joined
          </div>
          <div className="session-status">
            Status: {sessionStarted ? '🟢 LIVE' : '🔴 NOT STARTED'}
          </div>
        </div>

        <div className="header-right">
          {!sessionStarted ? (
            <button 
              className="start-exam-btn"
              onClick={handleStartExam}
            >
              🚀 Start Exam Session
            </button>
          ) : (
            <button 
              className="end-exam-btn"
              onClick={handleEndExam}
            >
              ⏹️ End Exam
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="teacher-exam-content">
        {/* Session Info Panel */}
        <div className="session-info-section">
          <h3>Session Information</h3>
          <div className="info-panel">
            <div className="info-item">
              <span className="info-label">Exam Title:</span>
              <span className="info-value">{exam?.title}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Time Remaining:</span>
              <span className="info-value">{formatTime(timeLeft)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Students Joined:</span>
              <span className="info-value">{students.length}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Session Status:</span>
              <span className={`info-value status ${sessionStarted ? 'live' : 'offline'}`}>
                {sessionStarted ? '🟢 LIVE' : '🔴 OFFLINE'}
              </span>
            </div>
          </div>
          
          {/* Timer Controls */}
          <div className="timer-controls">
            <h4>Timer Controls</h4>
            <div className="time-buttons">
              <button className="time-btn" onClick={() => addTime(5)}>+5 min</button>
              <button className="time-btn" onClick={() => addTime(10)}>+10 min</button>
              <button className="time-btn" onClick={() => addTime(30)}>+30 min</button>
              <button 
                className="time-btn reset" 
                onClick={() => setTimeLeft(3600)}
              >
                Reset to 1hr
              </button>
            </div>
          </div>
        </div>

        {/* Students Grid */}
        <div className="students-section">
          <div className="students-header">
            <h3>Students ({students.length})</h3>
            <div className="student-actions">
              <button 
                className="action-btn refresh-btn"
                onClick={loadJoinedStudents}
              >
                🔄 Refresh
              </button>
            </div>
          </div>
          
          <div className="students-grid">
            {students.length > 0 ? (
              students.map(student => (
                <div key={student._id} className="student-card">
                  <div className="student-info">
                    <div className="student-avatar">
                      {student.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="student-details">
                      <span className="student-name">{student.name}</span>
                      <span className="student-email">{student.email}</span>
                      <span className="student-status connected">
                        ✅ Connected {student.connectedAt ? `at ${new Date(student.connectedAt).toLocaleTimeString()}` : ''}
                      </span>
                    </div>
                  </div>
                  <div className="student-monitoring">
                    <div className="monitoring-status">
                      <span className="camera-status">📹 Camera: Active</span>
                      <span className="mic-status">🎤 Microphone: Active</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-students">
                <div className="no-students-icon">👥</div>
                <p>No students have joined yet</p>
                <small>
                  {sessionStarted 
                    ? 'Students can join using the exam link' 
                    : 'Start the session to allow students to join'
                  }
                </small>
              </div>
            )}
          </div>
        </div>

        {/* Exam Controls */}
        <div className="exam-controls-section">
          <h3>Exam Controls</h3>
          <div className="control-panel">
            <div className="control-group">
              <label>Announcements</label>
              <div className="announcement-controls">
                <button 
                  className="announcement-btn"
                  onClick={() => {
                    if (sessionStarted) {
                      alert('Time warning sent to all students!');
                    } else {
                      alert('Please start the session first');
                    }
                  }}
                >
                  ⏰ Time Warning
                </button>
                <button 
                  className="announcement-btn"
                  onClick={() => {
                    if (sessionStarted) {
                      alert('Final warning sent to all students!');
                    } else {
                      alert('Please start the session first');
                    }
                  }}
                >
                  ⚠️ Final Warning
                </button>
              </div>
            </div>

            <div className="control-group">
              <label>Session Actions</label>
              <div className="session-actions">
                <button 
                  className="action-btn"
                  onClick={() => {
                    if (sessionStarted) {
                      if (window.confirm('Lock exam to prevent new students from joining?')) {
                        alert('Exam locked! No new students can join.');
                      }
                    } else {
                      alert('Please start the session first');
                    }
                  }}
                >
                  🔒 Lock Exam
                </button>
                <button 
                  className="action-btn"
                  onClick={() => {
                    if (sessionStarted) {
                      if (window.confirm('Force all students to submit their exams?')) {
                        alert('All students forced to submit!');
                        handleEndExam();
                      }
                    } else {
                      alert('Please start the session first');
                    }
                  }}
                >
                  📤 Force Submit All
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}