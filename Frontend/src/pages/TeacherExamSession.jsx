// TeacherExamSession.jsx - FIXED VIDEO STREAMING
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
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
  const [socketStatus, setSocketStatus] = useState('connecting');
  const [socket, setSocket] = useState(null);
  const [studentStreams, setStudentStreams] = useState({});
  const [peerConnections, setPeerConnections] = useState({});
  
  const timerRef = useRef(null);
  const videoRefs = useRef({});
  const streamTimeouts = useRef({});
  const playAttempts = useRef({});
  const socketRef = useRef(null);
  const activeConnections = useRef(new Set()); // ✅ TRACK ACTIVE CONNECTIONS

  // ✅ FIXED: Initialize Socket.io
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('❌ No token available for socket connection');
      setSocketStatus('error');
      return;
    }

    console.log('🔑 Connecting teacher socket...');
    setSocketStatus('connecting');

    const newSocket = io('http://localhost:3000', {
      auth: { 
        token: token 
      },
      query: { 
        examId: examId, 
        userRole: 'teacher' 
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    newSocket.on('connect', () => {
      console.log('✅ Teacher Socket connected successfully with ID:', newSocket.id);
      setSocketStatus('connected');
      
      newSocket.emit('join-exam-room', {
        roomId: `exam-${examId}`,
        userName: 'Teacher',
        userId: 'teacher',
        userRole: 'teacher'
      });
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Teacher Socket connection failed:', error.message);
      setSocketStatus('error');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Teacher Socket disconnected. Reason:', reason);
      setSocketStatus('disconnected');
    });

    // Socket event listeners
    newSocket.on('student-joined', handleStudentJoined);
    newSocket.on('student-left', handleStudentLeft);
    newSocket.on('room-participants', handleRoomParticipants);
    newSocket.on('webrtc-offer', handleWebRTCOffer);
    newSocket.on('webrtc-answer', handleWebRTCAnswer);
    newSocket.on('ice-candidate', handleICECandidate);
    newSocket.on('camera-response', handleCameraResponse);

    setSocket(newSocket);
    socketRef.current = newSocket;

    return () => {
      console.log('🛑 Cleaning up teacher socket');
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current.close();
        socketRef.current = null;
      }
      
      cleanupAllConnections();
    };
  }, [examId]);
const enableAllVideos = () => {
  console.log('🎮 User gesture detected, enabling all videos');
  Object.values(videoRefs.current).forEach(videoElement => {
    if (videoElement && videoElement.srcObject) {
      videoElement.play().catch(e => console.log('Gesture play failed:', e.name));
    }
  });
};
  // ✅ NEW: Clean up all connections
  const cleanupAllConnections = () => {
    console.log('🧹 Cleaning up ALL connections');
    
    // Clean up all peer connections
    Object.values(peerConnections).forEach(pc => {
      if (pc && typeof pc.close === 'function') {
        try {
          pc.close();
        } catch (error) {
          console.warn('Error closing peer connection:', error);
        }
      }
    });
    
    // Clean up all streams
    Object.values(studentStreams).forEach(stream => {
      if (stream && stream.getTracks) {
        stream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (error) {
            console.warn('Error stopping track:', error);
          }
        });
      }
    });
    
    // Clean up all video elements
    Object.values(videoRefs.current).forEach(videoElement => {
      if (videoElement) {
        videoElement.srcObject = null;
        videoElement.load();
      }
    });
    
    // Clear all timeouts
    Object.values(streamTimeouts.current).forEach(timeout => {
      if (timeout) clearTimeout(timeout);
    });
    Object.values(playAttempts.current).forEach(timeout => {
      if (timeout) clearTimeout(timeout);
    });
    
    // Clear active connections
    activeConnections.current.clear();
  };

  // Handle room participants
  const handleRoomParticipants = (data) => {
    console.log('👥 Room participants:', data);
    if (data.students && data.students.length > 0) {
      const formattedStudents = data.students.map(student => ({
        studentId: student.studentId,
        name: student.studentName,
        email: student.studentEmail || '',
        socketId: student.socketId,
        joinedAt: student.joinedAt || new Date(),
        cameraEnabled: student.cameraEnabled || false,
        _id: student.studentId || student.socketId
      }));
      
      setStudents(formattedStudents);
    }
  };

  // Handle student joining
  const handleStudentJoined = (data) => {
    console.log('🎯 Student joined:', data);
    
    setStudents(prev => {
      const exists = prev.find(s => 
        s.studentId === data.studentId || s.socketId === data.socketId
      );
      if (!exists) {
        return [...prev, {
          studentId: data.studentId,
          name: data.studentName,
          email: data.studentEmail || '',
          socketId: data.socketId,
          joinedAt: data.joinedAt || new Date(),
          cameraEnabled: false,
          _id: data.studentId || data.socketId
        }];
      }
      return prev;
    });

    // Request camera after student joins with delay
    setTimeout(() => {
      requestStudentCamera(data.socketId);
    }, 1000);
  };

  // Handle student leaving
  const handleStudentLeft = (data) => {
    console.log('🚪 Student left:', data);
    
    setStudents(prev => prev.filter(student => student.socketId !== data.socketId));
    cleanupStudentConnection(data.socketId);
  };

  // ✅ IMPROVED: Clean up student connection
  const cleanupStudentConnection = (socketId) => {
    console.log('🧹 Cleaning up connection for:', socketId);
    
    // Remove from active connections
    activeConnections.current.delete(socketId);
    
    if (peerConnections[socketId]) {
      const pc = peerConnections[socketId];
      try {
        pc.close();
      } catch (error) {
        console.warn('Error closing peer connection:', error);
      }
      
      setPeerConnections(prev => {
        const newPCs = { ...prev };
        delete newPCs[socketId];
        return newPCs;
      });
    }
    
    if (studentStreams[socketId]) {
      const stream = studentStreams[socketId];
      if (stream && stream.getTracks) {
        stream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (error) {
            console.warn('Error stopping track:', error);
          }
        });
      }
      setStudentStreams(prev => {
        const newStreams = { ...prev };
        delete newStreams[socketId];
        return newStreams;
      });
    }
    
    if (videoRefs.current[socketId]) {
      const videoElement = videoRefs.current[socketId];
      if (videoElement) {
        videoElement.srcObject = null;
        videoElement.load();
      }
      delete videoRefs.current[socketId];
    }
    
    if (streamTimeouts.current[socketId]) {
      clearTimeout(streamTimeouts.current[socketId]);
      delete streamTimeouts.current[socketId];
    }
    
    if (playAttempts.current[socketId]) {
      clearTimeout(playAttempts.current[socketId]);
      delete playAttempts.current[socketId];
    }
  };

  // ✅ FIXED: Request camera with connection tracking
// ✅ FIXED: PREVENT DUPLICATE CAMERA REQUESTS
const requestStudentCamera = (studentSocketId) => {
  if (!isSocketConnected() || !studentSocketId) {
    console.warn('⚠️ Socket not connected for camera request');
    return;
  }

  // ✅ BETTER DUPLICATE PREVENTION - Check if we already have a stream
  if (studentStreams[studentSocketId]) {
    console.log('✅ Already have stream for:', studentSocketId);
    return;
  }

  // ✅ Check if we're already processing this student
  if (activeConnections.current.has(studentSocketId)) {
    console.log('⏳ Already processing camera for:', studentSocketId);
    return;
  }

  console.log('📹 Requesting camera from student:', studentSocketId);
  activeConnections.current.add(studentSocketId);
  
  socketRef.current.emit('request-student-camera', {
    studentSocketId: studentSocketId,
    roomId: `exam-${examId}`
  });
  
  // ✅ CLEANER TIMEOUT HANDLING
  if (streamTimeouts.current[studentSocketId]) {
    clearTimeout(streamTimeouts.current[studentSocketId]);
  }
  
 // ✅ INCREASE TIMEOUT FOR BETTER CONNECTION
streamTimeouts.current[studentSocketId] = setTimeout(() => {
  console.log('🕒 Camera request timeout for:', studentSocketId);
  activeConnections.current.delete(studentSocketId);
  cleanupStudentConnection(studentSocketId);
}, 30000); // ⬅️ Increased from 15000 to 30000 (30 seconds)
};

// ✅ FIXED: ALLOW NEW OFFERS EVEN IF CONNECTION EXISTS
const handleWebRTCOffer = async (data) => {
  console.log('🎯 Received WebRTC offer from:', data.from);
  
  // ✅ ALLOW RECONNECTION - Don't block if connection exists
  // Clean up existing connection first
  if (peerConnections[data.from]) {
    console.log('🔄 Closing existing peer connection for:', data.from);
    cleanupStudentConnection(data.from);
    await new Promise(resolve => setTimeout(resolve, 500)); // Longer delay
  }

  // ✅ REMOVE the activeConnections check - allow new offers
  activeConnections.current.add(data.from);

  try {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // ✅ FIXED: BETTER STREAM HANDLING IN ONTRACK
peerConnection.ontrack = (event) => {
  console.log('📹 Received track event from:', data.from);
  
  if (event.streams && event.streams.length > 0) {
    const stream = event.streams[0];
    console.log('🎬 Stream received - Tracks:', stream.getTracks().length);

    // ✅ FORCE STREAM UPDATE
    setStudentStreams(prev => {
      const newStreams = { ...prev };
      newStreams[data.from] = stream;
      return newStreams;
    });

    // ✅ UPDATE STUDENT STATUS
    setStudents(prev => prev.map(student => 
      student.socketId === data.from 
        ? { ...student, cameraEnabled: true }
        : student
    ));

    // ✅ DELAYED VIDEO SETUP TO ENSURE COMPONENT UPDATE
    setTimeout(() => {
      const videoElement = videoRefs.current[data.from];
      if (videoElement && stream) {
        console.log('🎬 Final video setup for:', data.from);
        
        // Ensure clean setup
        videoElement.srcObject = null;
        videoElement.srcObject = stream;
        videoElement.muted = true;
        videoElement.playsInline = true;
        videoElement.setAttribute('autoplay', 'true');
        videoElement.setAttribute('muted', 'true');
        
        // Force play with multiple attempts
        const attemptPlay = async (attempt = 0) => {
          try {
            await videoElement.play();
            console.log('✅ Video playback successful on attempt:', attempt + 1);
          } catch (error) {
            console.log(`⚠️ Play attempt ${attempt + 1} failed:`, error.name);
            if (attempt < 3) {
              setTimeout(() => attemptPlay(attempt + 1), 500);
            }
          }
        };
        
        attemptPlay();
      }
    }, 300);
  }
};

    peerConnection.oniceconnectionstatechange = () => {
      const state = peerConnection.iceConnectionState;
      console.log('🧊 ICE connection state for', data.from, ':', state);
      
      if (state === 'connected' || state === 'completed') {
        console.log('✅ WebRTC connected for:', data.from);
      }
      
      if (state === 'failed' || state === 'disconnected') {
        console.log('❌ WebRTC failed for:', data.from);
        // Don't cleanup immediately, allow reconnection
        setTimeout(() => {
          if (peerConnection.iceConnectionState === 'failed') {
            cleanupStudentConnection(data.from);
          }
        }, 3000);
      }
    };

    // Store the connection
    setPeerConnections(prev => ({
      ...prev,
      [data.from]: peerConnection
    }));

    // Process the offer
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
    console.log('✅ Remote description set for:', data.from);
    
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    console.log('✅ Answer created for:', data.from);

    // Send answer back
    if (isSocketConnected()) {
      socketRef.current.emit('webrtc-answer', {
        target: data.from,
        answer: answer
      });
      console.log('✅ Sent WebRTC answer to student:', data.from);
    }

  } catch (error) {
    console.error('❌ Error handling WebRTC offer:', error);
    activeConnections.current.delete(data.from);
    cleanupStudentConnection(data.from);
  }
};



// ✅ FIXED: VIDEO PLAYBACK WITH AUTOPLAY HANDLING
const setVideoRef = (socketId, element) => {
  if (element) {
    videoRefs.current[socketId] = element;
    
    // If stream exists, set it up immediately
    const stream = studentStreams[socketId];
    if (stream && element.srcObject !== stream) {
      console.log('🎬 Setting existing stream for student:', socketId);
      element.srcObject = stream;
      element.muted = true;
      element.playsInline = true;
      
      // ✅ IMPROVED AUTOPLAY HANDLING
      const playVideo = async () => {
        try {
          await element.play();
          console.log('✅ Video playing successfully for:', socketId);
        } catch (error) {
          console.log('⚠️ Auto-play failed, will retry:', error.name);
          
          // ✅ RETRY WITH USER GESTURE
          const handleUserInteraction = () => {
            element.play().catch(e => console.log('Final play failed:', e.name));
            document.removeEventListener('click', handleUserInteraction);
            document.removeEventListener('touchstart', handleUserInteraction);
          };
          
          document.addEventListener('click', handleUserInteraction);
          document.addEventListener('touchstart', handleUserInteraction);
        }
      };
      
      playVideo();
    }
  } else {
    // Remove reference when element unmounts
    delete videoRefs.current[socketId];
  }
};
      

  // ✅ SIMPLIFIED: Video element setup
  const setupVideoElement = (socketId, stream) => {
    const videoElement = videoRefs.current[socketId];
    if (!videoElement) {
      console.log('❌ Video element not found for:', socketId);
      return;
    }

    console.log('🎬 SIMPLIFIED Video setup for:', socketId);
    
    // Clear previous stream
    videoElement.srcObject = null;
    
    // Simple setup - walang complex event listeners
    videoElement.srcObject = stream;
    videoElement.muted = true;
    videoElement.playsInline = true;
    
    // Simple play attempt
    const playVideo = async () => {
      try {
        await videoElement.play();
        console.log('✅ Video playing for:', socketId);
      } catch (error) {
        console.log('⚠️ Auto-play failed, user interaction needed:', socketId);
      }
    };
    
    playVideo();
  };

  // Handle WebRTC answer
  const handleWebRTCAnswer = async (data) => {
    const peerConnection = peerConnections[data.from];
    if (peerConnection) {
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        console.log('✅ Set remote description from answer for:', data.from);
      } catch (error) {
        console.error('❌ Error setting remote description from answer:', error);
      }
    }
  };

  // Handle ICE candidate
  const handleICECandidate = async (data) => {
    const peerConnection = peerConnections[data.from];
    if (peerConnection && data.candidate) {
      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (error) {
        console.error('❌ Error adding ICE candidate:', error);
      }
    }
  };

  // Handle camera response
  const handleCameraResponse = (data) => {
    console.log('📹 Camera response:', data);
    setStudents(prev => prev.map(student => 
      student.socketId === data.socketId 
        ? { ...student, cameraEnabled: data.enabled }
        : student
    ));
  };

  // ✅ FIXED: Video element reference handler
  
  // Socket connection checker
  const isSocketConnected = () => {
    return socketRef.current && socketRef.current.connected;
  };

  // Load exam data
  useEffect(() => {
    const loadExamData = async () => {
      try {
        setLoading(true);
        
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }
        
        const examResponse = await api.get(`/exams/${examId}/details`);
        
        if (examResponse.success) {
          setExam(examResponse.data);
          setTimeLeft(examResponse.data.timeLimit * 60 || 3600);
          setSessionStarted(examResponse.data.isActive || false);
        }
        
        await loadJoinedStudents();
        
      } catch (error) {
        console.error('❌ Failed to load exam data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadExamData();
  }, [examId, navigate]);

  // Load joined students
  const loadJoinedStudents = async () => {
    try {
      const response = await getJoinedStudents(examId);
      if (response.success) {
        const studentsWithSocket = response.data.joinedStudents.map(student => ({
          ...student,
          socketId: null,
          cameraEnabled: false,
          _id: student._id || student.studentId
        }));
        setStudents(studentsWithSocket);
      }
    } catch (error) {
      console.error('Failed to load joined students:', error);
    }
  };

  // Start exam session
  const handleStartExam = async () => {
    try {
      const response = await startExamSession(examId);
      if (response.success) {
        setSessionStarted(true);
        setIsTimerRunning(true);
        console.log('✅ Exam session started');
        
        // Request camera from students with delays
        students.forEach((student, index) => {
          if (student.socketId) {
            setTimeout(() => {
              requestStudentCamera(student.socketId);
            }, 1000 + (index * 1000));
          }
        });
      }
    } catch (error) {
      console.error('Failed to start exam:', error);
      alert('Failed to start exam session');
    }
  };

  // End exam session
  const handleEndExam = async () => {
    try {
      cleanupAllConnections();
      
      setPeerConnections({});
      setStudentStreams({});
      videoRefs.current = {};
      
      const response = await endExamSession(examId);
      if (response.success) {
        setSessionStarted(false);
        setIsTimerRunning(false);
        setStudents([]);
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
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, timeLeft]);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
const renderStudentVideos = () => {
  return students
    .filter(student => student.socketId && studentStreams[student.socketId])
    .map((student) => {
      const socketId = student.socketId;
      const stream = studentStreams[socketId];
      const videoElement = videoRefs.current[socketId];
      const isVideoPlaying = videoElement && 
                            !videoElement.paused && 
                            videoElement.readyState >= 3 &&
                            videoElement.srcObject === stream;
      
      return (
        <div key={socketId} className="student-video-card">
          <div className="video-container">
          <video 
  ref={(element) => setVideoRef(socketId, element)}
  autoPlay 
  muted
  playsInline
  className={`student-video ${isVideoPlaying ? 'playing' : 'loading'}`}
  // ✅ ADD THESE ATTRIBUTES FOR BETTER AUTOPLAY SUPPORT
  onLoadedMetadata={() => {
    const video = videoRefs.current[socketId];
    if (video) video.play().catch(e => console.log('Metadata play failed:', e.name));
  }}
/>
            {!isVideoPlaying && (
              <div className="video-loading-overlay">
                <div className="loading-spinner-small"></div>
                <span>Connecting camera...</span>
              </div>
            )}
          </div>
          <div className="video-info">
            <div className="student-details">
              <span className="student-name">{student?.name || 'Student'}</span>
              {student && (
                <span className="student-id">ID: {student.studentId?.substring(0, 8)}</span>
              )}
            </div>
            <span className={`camera-status ${isVideoPlaying ? 'live' : 'connecting'}`}>
              {isVideoPlaying ? '📹 Live' : '📹 Connecting...'}
            </span>
          </div>
        </div>
      );
    });
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
      <div className="teacher-exam-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </button>
          <div className="exam-info">
            <h1>{exam?.title || 'Exam Session'}</h1>
            <p>Class: {exam?.classId?.name || 'Current Class'}</p>
          </div>
        </div>
        
        <div className="header-center">
          <div className="timer-display">
            <span className="timer-text">{formatTime(timeLeft)}</span>
          </div>
          <div className="student-count">
            👥 {students.length} Students
          </div>
          <div className={`socket-status ${socketStatus}`}>
            {socketStatus === 'connected' && '🟢 Connected'}
            {socketStatus === 'connecting' && '🟡 Connecting...'}
            {socketStatus === 'error' && '🔴 Error'}
            {socketStatus === 'disconnected' && '⚫ Disconnected'}
          </div>
        </div>
        <div className="header-right">
          {!sessionStarted ? (
            <button className="start-exam-btn" onClick={handleStartExam}>
              🚀 Start Exam
            </button>
          ) : (
            <button className="end-exam-btn" onClick={handleEndExam}>
              ⏹️ End Exam
            </button>
          )}
        </div>
      </div>

      <div className="teacher-exam-content">
        <div className="videos-section">
          <h3>Student Cameras ({Object.keys(studentStreams).length} Live)</h3>
          <div className="video-grid">
            {Object.keys(studentStreams).length > 0 ? (
              renderStudentVideos()
            ) : (
              <div className="no-videos">
                <p>No student cameras active</p>
                <small>Student cameras will appear here when they join and grant permission</small>
              </div>
            )}
          </div>
        </div>

        <div className="students-section">
          <div className="students-header">
            <h3>Students ({students.length})</h3>
            <button className="refresh-btn" onClick={loadJoinedStudents}>
              🔄 Refresh
            </button>
          </div>
          
          <div className="students-list">
            {students.length > 0 ? (
              students.map((student) => (
                <div key={student._id || student.socketId} className="student-card">
                  <div className="student-info">
                    <div className="student-avatar">
                      {student.name?.charAt(0).toUpperCase() || 'S'}
                    </div>
                    <div className="student-details">
                      <span className="student-name">{student.name || 'Student'}</span>
                      <div className="student-status">
                        <span className={`camera-indicator ${student.cameraEnabled ? 'active' : 'inactive'}`}>
                          {student.cameraEnabled ? '📹 Camera On' : '📹 Camera Off'}
                        </span>
                        {student.socketId && (
                          <span className="connection-status connected">✅ Online</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {student.socketId && !student.cameraEnabled && (
                    <button 
                      className="request-camera-btn"
                      onClick={() => requestStudentCamera(student.socketId)}
                      disabled={!isSocketConnected()}
                    >
                      📹 Request Camera
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="no-students">
                <p>No students have joined yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}