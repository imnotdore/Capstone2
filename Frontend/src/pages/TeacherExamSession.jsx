// src/components/TeacherExamSession.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import './TeacherExamSession.css';

export default function TeacherExamSession() {
  const { examId } = useParams();
  const navigate = useNavigate();
  
  const [exam, setExam] = useState(null);
  const [students, setStudents] = useState([]);
  const [timeLeft, setTimeLeft] = useState(3600); // 1 hour default
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [teacherStream, setTeacherStream] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const videoRef = useRef(null);
  const timerRef = useRef(null);

  // Load exam details
  useEffect(() => {
    const loadExam = async () => {
      try {
        const response = await api.get(`/exams/${examId}`);
        if (response.success) {
          setExam(response.data);
          setTimeLeft(response.data.timeLimit * 60 || 3600);
        }
      } catch (error) {
        console.error('Failed to load exam:', error);
      } finally {
        setLoading(false);
      }
    };

    loadExam();
  }, [examId]);

  // Initialize teacher camera
  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setTeacherStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Failed to initialize camera:', error);
    }
  };

  // Start exam session
  const startExamSession = async () => {
    try {
      await api.post(`/exams/${examId}/start`);
      setIsTimerRunning(true);
      initializeCamera();
    } catch (error) {
      console.error('Failed to start exam:', error);
    }
  };

  // End exam session
  const endExamSession = async () => {
    try {
      await api.post(`/exams/${examId}/end`);
      setIsTimerRunning(false);
      if (teacherStream) {
        teacherStream.getTracks().forEach(track => track.stop());
      }
      navigate('/dashboard');
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
    } else if (timeLeft <= 0) {
      endExamSession();
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
            <h1>{exam?.title}</h1>
            <p>Class: {exam?.classId?.name}</p>
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
        </div>

        <div className="header-right">
          {!isTimerRunning ? (
            <button 
              className="start-exam-btn"
              onClick={startExamSession}
            >
              🚀 Start Exam Session
            </button>
          ) : (
            <button 
              className="end-exam-btn"
              onClick={endExamSession}
            >
              ⏹️ End Exam
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="teacher-exam-content">
        {/* Teacher Camera */}
        <div className="teacher-camera-section">
          <h3>Your Camera</h3>
          <div className="teacher-camera">
            <video 
              ref={videoRef}
              autoPlay 
              muted 
              playsInline
              className="camera-video"
            />
          </div>
          <div className="camera-controls">
            <button className="control-btn">🎤 Mute</button>
            <button className="control-btn">📹 Stop Video</button>
            <button className="control-btn">🔄 Flip Camera</button>
          </div>
        </div>

        {/* Students Grid */}
        <div className="students-section">
          <h3>Students ({students.length})</h3>
          <div className="students-grid">
            {students.length > 0 ? (
              students.map(student => (
                <div key={student._id} className="student-card">
                  <div className="student-video">
                    <div className="video-placeholder">
                      <span className="student-avatar">
                        {student.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="student-info">
                      <span className="student-name">{student.name}</span>
                      <span className="student-status connected">✅ Connected</span>
                    </div>
                  </div>
                  <div className="student-controls">
                    <button className="student-control-btn" title="Mute student">
                      🔇
                    </button>
                    <button className="student-control-btn" title="Disable camera">
                      📹
                    </button>
                    <button className="student-control-btn" title="Remove student">
                      🚫
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-students">
                <div className="no-students-icon">👥</div>
                <p>Waiting for students to join...</p>
                <small>Share the exam code with your students</small>
              </div>
            )}
          </div>
        </div>

        {/* Exam Controls */}
        <div className="exam-controls-section">
          <h3>Exam Controls</h3>
          <div className="control-panel">
            <div className="control-group">
              <label>Add Time</label>
              <div className="time-controls">
                <button className="time-btn">+5 min</button>
                <button className="time-btn">+10 min</button>
                <button className="time-btn">+30 min</button>
              </div>
            </div>
            
            <div className="control-group">
              <label>Announcements</label>
              <div className="announcement-controls">
                <button className="announcement-btn">Time Warning</button>
                <button className="announcement-btn">Final Warning</button>
              </div>
            </div>

            <div className="control-group">
              <label>Student Actions</label>
              <div className="student-actions">
                <button className="action-btn">Mute All</button>
                <button className="action-btn">Lock Exam</button>
                <button className="action-btn">Force Submit</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}