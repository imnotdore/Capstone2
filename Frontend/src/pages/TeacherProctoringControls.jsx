// TeacherProctoringControls.jsx - UPDATED WITH ATTEMPTS LEFT SYSTEM
import React, { useState, useEffect } from 'react';
import './TeacherProctoringControls.css';

export default function TeacherProctoringControls({ 
  examId, 
  socket, 
  students,
  onDetectionSettingsChange 
}) {
  const [detectionSettings, setDetectionSettings] = useState({});
  const [expandedStudent, setExpandedStudent] = useState(null);
  const [globalSettings, setGlobalSettings] = useState({
    faceDetection: true,
    gazeDetection: true,
    phoneDetection: true,
    mouthDetection: true,
    multiplePeopleDetection: true,
    audioDetection: true,
    maxAttempts: 10, // ✅ ADDED: Default max attempts
    autoDisconnect: true // ✅ ADDED: Auto disconnect when attempts exhausted
  });

  // Student attempts tracking
  const [studentAttempts, setStudentAttempts] = useState({});

  // Initialize detection settings for each student
  useEffect(() => {
    const initialSettings = {};
    const initialAttempts = {};
    
    students.forEach(student => {
      if (!detectionSettings[student.socketId]) {
        initialSettings[student.socketId] = {
          faceDetection: true,
          gazeDetection: true,
          phoneDetection: true,
          mouthDetection: true,
          multiplePeopleDetection: true,
          audioDetection: true,
          maxAttempts: 10, // ✅ ADDED: Per-student max attempts
          autoDisconnect: true, // ✅ ADDED: Per-student auto disconnect
          customMessage: ''
        };
      }
      
      // Initialize attempts tracking
      if (!studentAttempts[student.socketId]) {
        initialAttempts[student.socketId] = {
          currentAttempts: 0,
          maxAttempts: globalSettings.maxAttempts,
          attemptsLeft: globalSettings.maxAttempts,
          history: []
        };
      }
    });
    
    if (Object.keys(initialSettings).length > 0) {
      setDetectionSettings(prev => ({ ...prev, ...initialSettings }));
    }
    
    if (Object.keys(initialAttempts).length > 0) {
      setStudentAttempts(prev => ({ ...prev, ...initialAttempts }));
    }
  }, [students]);

  // Listen for student violation events
  useEffect(() => {
    if (!socket) return;

    const handleStudentViolation = (data) => {
      console.log('🚨 Student violation detected:', data);
      
      const { studentSocketId, violationType, severity } = data;
      
      // Update attempts for the student
      setStudentAttempts(prev => {
        const current = prev[studentSocketId] || {
          currentAttempts: 0,
          maxAttempts: globalSettings.maxAttempts,
          attemptsLeft: globalSettings.maxAttempts,
          history: []
        };
        
        const newAttempts = current.currentAttempts + 1;
        const attemptsLeft = Math.max(0, current.maxAttempts - newAttempts);
        
        const updated = {
          ...prev,
          [studentSocketId]: {
            ...current,
            currentAttempts: newAttempts,
            attemptsLeft: attemptsLeft,
            history: [
              ...current.history,
              {
                timestamp: new Date().toISOString(),
                violationType,
                severity,
                attemptsUsed: newAttempts,
                attemptsLeft: attemptsLeft
              }
            ].slice(-10) // Keep last 10 entries
          }
        };
        
        // Check if attempts exhausted and auto-disconnect is enabled
        const studentSettings = detectionSettings[studentSocketId] || globalSettings;
       // ✅ CHECK IF ATTEMPTS EXHAUSTED AND AUTO-DISCONNECT IS ENABLED
if (attemptsLeft <= 0 && studentSettings.autoDisconnect) {
  console.log(`🔌 Auto-disconnecting student ${studentSocketId} - attempts exhausted`);
  socket.emit('disconnect-student', {
    studentSocketId: studentSocketId,
    reason: 'Attempts exhausted',
    examId: examId
  });
  
  // Show confirmation to teacher
  alert(`🔌 Student ${student.name} has been automatically disconnected - Attempts exhausted`);
}
        
        return updated;
      });
    };

    socket.on('student-violation', handleStudentViolation);
    
    return () => {
      socket.off('student-violation', handleStudentViolation);
    };
  }, [socket, globalSettings, detectionSettings, examId]);

  // Notify parent component when settings change
  useEffect(() => {
    onDetectionSettingsChange?.({
      global: globalSettings,
      perStudent: detectionSettings,
      studentAttempts: studentAttempts
    });
  }, [globalSettings, detectionSettings, studentAttempts, onDetectionSettingsChange]);

  const toggleStudentExpansion = (studentSocketId) => {
    setExpandedStudent(expandedStudent === studentSocketId ? null : studentSocketId);
  };

  const toggleGlobalDetection = (detectionType) => {
    setGlobalSettings(prev => ({
      ...prev,
      [detectionType]: !prev[detectionType]
    }));

    // Apply to all students
    const newSettings = { ...detectionSettings };
    Object.keys(newSettings).forEach(socketId => {
      newSettings[socketId] = {
        ...newSettings[socketId],
        [detectionType]: !globalSettings[detectionType]
      };
    });
    setDetectionSettings(newSettings);
  };

  const toggleStudentDetection = (studentSocketId, detectionType) => {
    setDetectionSettings(prev => ({
      ...prev,
      [studentSocketId]: {
        ...prev[studentSocketId],
        [detectionType]: !prev[studentSocketId]?.[detectionType]
      }
    }));
  };

  // ✅ ADDED: Update global max attempts
  const updateGlobalMaxAttempts = (newMaxAttempts) => {
    const maxAttempts = Math.max(1, Math.min(50, newMaxAttempts)); // Limit between 1-50
    
    setGlobalSettings(prev => ({
      ...prev,
      maxAttempts: maxAttempts
    }));

    // Update all students' max attempts
    const newSettings = { ...detectionSettings };
    const newAttempts = { ...studentAttempts };
    
    Object.keys(newSettings).forEach(socketId => {
      newSettings[socketId] = {
        ...newSettings[socketId],
        maxAttempts: maxAttempts
      };
      
      // Update attempts tracking
      if (newAttempts[socketId]) {
        newAttempts[socketId] = {
          ...newAttempts[socketId],
          maxAttempts: maxAttempts,
          attemptsLeft: Math.max(0, maxAttempts - newAttempts[socketId].currentAttempts)
        };
      }
    });
    
    setDetectionSettings(newSettings);
    setStudentAttempts(newAttempts);
  };

  // ✅ ADDED: Update student-specific max attempts
  const updateStudentMaxAttempts = (studentSocketId, newMaxAttempts) => {
    const maxAttempts = Math.max(1, Math.min(50, newMaxAttempts));
    
    setDetectionSettings(prev => ({
      ...prev,
      [studentSocketId]: {
        ...prev[studentSocketId],
        maxAttempts: maxAttempts
      }
    }));
    
    // Update attempts tracking for this student
    setStudentAttempts(prev => {
      const current = prev[studentSocketId];
      if (!current) return prev;
      
      return {
        ...prev,
        [studentSocketId]: {
          ...current,
          maxAttempts: maxAttempts,
          attemptsLeft: Math.max(0, maxAttempts - current.currentAttempts)
        }
      };
    });
  };

  // ✅ ADDED: Reset student attempts
  const resetStudentAttempts = (studentSocketId) => {
    setStudentAttempts(prev => ({
      ...prev,
      [studentSocketId]: {
        currentAttempts: 0,
        maxAttempts: detectionSettings[studentSocketId]?.maxAttempts || globalSettings.maxAttempts,
        attemptsLeft: detectionSettings[studentSocketId]?.maxAttempts || globalSettings.maxAttempts,
        history: []
      }
    }));
  };

  // ✅ ADDED: Manually add violation
  const addManualViolation = (studentSocketId, violationType = 'Manual Violation') => {
    if (!socket) return;
    
    socket.emit('manual-violation', {
      studentSocketId: studentSocketId,
      violationType: violationType,
      examId: examId
    });
    
    // Also trigger local update
    setStudentAttempts(prev => {
      const current = prev[studentSocketId] || {
        currentAttempts: 0,
        maxAttempts: globalSettings.maxAttempts,
        attemptsLeft: globalSettings.maxAttempts,
        history: []
      };
      
      const newAttempts = current.currentAttempts + 1;
      const attemptsLeft = Math.max(0, current.maxAttempts - newAttempts);
      
      return {
        ...prev,
        [studentSocketId]: {
          ...current,
          currentAttempts: newAttempts,
          attemptsLeft: attemptsLeft,
          history: [
            ...current.history,
            {
              timestamp: new Date().toISOString(),
              violationType: violationType,
              severity: 'manual',
              attemptsUsed: newAttempts,
              attemptsLeft: attemptsLeft
            }
          ].slice(-10)
        }
      };
    });
  };

  const sendCustomDetectionSetting = (studentSocketId) => {
    if (!socket || !studentSocketId) return;

    const settings = detectionSettings[studentSocketId];
    const customMessage = settings?.customMessage || '';

    console.log('📤 Sending detection settings to student:', {
      studentSocketId,
      settings,
      customMessage
    });

    if (settings) {
      socket.emit('update-detection-settings', {
        studentSocketId: studentSocketId,
        settings: settings,
        customMessage: customMessage,
        examId: examId
      });

      alert(`✅ Detection settings sent to student!`);
    }
  };

  const applySettingsToStudent = (studentSocketId) => {
    if (!socket || !studentSocketId) {
      alert('❌ Cannot send settings - Socket not connected');
      return;
    }

    const settings = detectionSettings[studentSocketId];
    
    if (!settings) {
      alert('❌ No settings found for this student');
      return;
    }

    console.log('🚀 APPLYING SETTINGS TO STUDENT:', {
      studentSocketId,
      settings
    });

    socket.emit('update-detection-settings', {
      studentSocketId: studentSocketId,
      settings: settings,
      customMessage: settings.customMessage || '',
      examId: examId
    });

    alert(`✅ Settings applied to student!`);
  };

  const applyGlobalToAll = () => {
    const newSettings = { ...detectionSettings };
    Object.keys(newSettings).forEach(socketId => {
      newSettings[socketId] = { ...globalSettings, customMessage: newSettings[socketId]?.customMessage || '' };
    });
    setDetectionSettings(newSettings);
    alert('✅ Global settings applied to all students');
  };

  const resetAllToDefault = () => {
    const defaultSettings = {};
    students.forEach(student => {
      defaultSettings[student.socketId] = {
        faceDetection: true,
        gazeDetection: true,
        phoneDetection: true,
        mouthDetection: true,
        multiplePeopleDetection: true,
        audioDetection: true,
        maxAttempts: 10,
        autoDisconnect: true,
        customMessage: ''
      };
    });
    setDetectionSettings(defaultSettings);
    setGlobalSettings({
      faceDetection: true,
      gazeDetection: true,
      phoneDetection: true,
      mouthDetection: true,
      multiplePeopleDetection: true,
      audioDetection: true,
      maxAttempts: 10,
      autoDisconnect: true
    });
    
    // Reset all attempts
    const resetAttempts = {};
    students.forEach(student => {
      resetAttempts[student.socketId] = {
        currentAttempts: 0,
        maxAttempts: 10,
        attemptsLeft: 10,
        history: []
      };
    });
    setStudentAttempts(resetAttempts);
    
    alert('✅ All detection settings and attempts reset to default');
  };

  const updateCustomMessage = (studentSocketId, message) => {
    setDetectionSettings(prev => ({
      ...prev,
      [studentSocketId]: {
        ...prev[studentSocketId],
        customMessage: message
      }
    }));
  };

  const getDetectionStatusColor = (isEnabled) => {
    return isEnabled ? '#4CAF50' : '#f44336';
  };

  const getDetectionStatusText = (isEnabled) => {
    return isEnabled ? 'ON' : 'OFF';
  };

  // ✅ ADDED: Get attempts display color
  const getAttemptsColor = (attemptsLeft, maxAttempts) => {
    const percentage = (attemptsLeft / maxAttempts) * 100;
    if (percentage <= 20) return '#f44336';
    if (percentage <= 50) return '#ff9800';
    return '#4CAF50';
  };

  // ✅ ADDED: Get attempts text
  const getAttemptsText = (studentSocketId) => {
    const attempts = studentAttempts[studentSocketId];
    if (!attempts) return '10 left';
    
    return `${attempts.attemptsLeft}/${attempts.maxAttempts} left`;
  };

  if (students.length === 0) {
    return (
      <div className="proctoring-controls-container">
        <div className="no-students-message">
          <div className="no-students-icon">👥</div>
          <h3>No Students Connected</h3>
          <p>Student proctoring controls will appear here when students join the exam.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="proctoring-controls-container">
      {/* Global Controls Header */}
      <div className="global-controls-section">
        <div className="section-header">
          <h3>🎯 Global Proctoring Controls</h3>
          <div className="global-actions">
            <button className="apply-global-btn" onClick={applyGlobalToAll}>
              🌍 Apply to All
            </button>
            <button className="reset-all-btn" onClick={resetAllToDefault}>
              🔄 Reset All
            </button>
          </div>
        </div>

        {/* Global Attempts Settings */}
        <div className="global-attempts-settings">
          <h5>🔄 Attempts Configuration</h5>
          <div className="attempts-controls">
            <div className="attempts-input-group">
              <label>Max Attempts Per Student:</label>
              <input
                type="number"
                min="1"
                max="50"
                value={globalSettings.maxAttempts}
                onChange={(e) => updateGlobalMaxAttempts(parseInt(e.target.value) || 10)}
                className="attempts-input"
              />
            </div>
            <div className="attempts-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={globalSettings.autoDisconnect}
                  onChange={(e) => setGlobalSettings(prev => ({ ...prev, autoDisconnect: e.target.checked }))}
                />
                Auto-disconnect when attempts exhausted
              </label>
            </div>
          </div>
        </div>

        {/* Global Toggle Buttons */}
        <div className="global-toggle-grid">
          <div className="global-toggle-item">
            <span className="toggle-label">👁️ Face Detection</span>
            <button 
              className={`toggle-btn ${globalSettings.faceDetection ? 'enabled' : 'disabled'}`}
              onClick={() => toggleGlobalDetection('faceDetection')}
            >
              {getDetectionStatusText(globalSettings.faceDetection)}
            </button>
          </div>
          
          <div className="global-toggle-item">
            <span className="toggle-label">👀 Gaze Detection</span>
            <button 
              className={`toggle-btn ${globalSettings.gazeDetection ? 'enabled' : 'disabled'}`}
              onClick={() => toggleGlobalDetection('gazeDetection')}
            >
              {getDetectionStatusText(globalSettings.gazeDetection)}
            </button>
          </div>
          
          
          
          <div className="global-toggle-item">
            <span className="toggle-label">🗣️ Mouth Detection</span>
            <button 
              className={`toggle-btn ${globalSettings.mouthDetection ? 'enabled' : 'disabled'}`}
              onClick={() => toggleGlobalDetection('mouthDetection')}
            >
              {getDetectionStatusText(globalSettings.mouthDetection)}
            </button>
          </div>
          
          <div className="global-toggle-item">
            <span className="toggle-label">👥 Multiple People</span>
            <button 
              className={`toggle-btn ${globalSettings.multiplePeopleDetection ? 'enabled' : 'disabled'}`}
              onClick={() => toggleGlobalDetection('multiplePeopleDetection')}
            >
              {getDetectionStatusText(globalSettings.multiplePeopleDetection)}
            </button>
          </div>
          
          <div className="global-toggle-item">
            <span className="toggle-label">🎤 Audio Detection</span>
            <button 
              className={`toggle-btn ${globalSettings.audioDetection ? 'enabled' : 'disabled'}`}
              onClick={() => toggleGlobalDetection('audioDetection')}
            >
              {getDetectionStatusText(globalSettings.audioDetection)}
            </button>
          </div>
        </div>
      </div>

      {/* Students List */}
      <div className="students-controls-section">
        <div className="section-header">
          <h3>👨‍🎓 Students ({students.length})</h3>
          <p className="section-subtitle">Click on a student to view and manage their detection settings</p>
        </div>

        <div className="students-list-minimal">
          {students.map((student, index) => {
            const attempts = studentAttempts[student.socketId];
            const attemptsLeft = attempts?.attemptsLeft || globalSettings.maxAttempts;
            const maxAttempts = attempts?.maxAttempts || globalSettings.maxAttempts;
            
            return (
              <div key={student.socketId} className="student-item-minimal">
                <div 
                  className="student-summary"
                  onClick={() => toggleStudentExpansion(student.socketId)}
                >
                  <div className="student-basic-info">
                    <div 
                      className="student-avatar-minimal"
                      style={{ backgroundColor: `hsl(${index * 137.5}, 70%, 60%)` }}
                    >
                      {student.name?.charAt(0).toUpperCase() || 'S'}
                    </div>
                    <div className="student-details-minimal">
                      <span className="student-name-minimal">{student.name}</span>
                      <span className="student-id-minimal">ID: {student.studentId}</span>
                    </div>
                  </div>
                  
                  <div className="student-status-minimal">
                    {/* ✅ ADDED: Attempts Display */}
                    <div 
                      className="attempts-display"
                      style={{ color: getAttemptsColor(attemptsLeft, maxAttempts) }}
                    >
                      <span className="attempts-text">
                        {attemptsLeft}/{maxAttempts} attempts
                      </span>
                    </div>
                    
                    <span className={`connection-status-minimal ${student.isConnected ? 'connected' : 'disconnected'}`}>
                      {student.isConnected ? '🟢' : '🔴'}
                    </span>
                    <span className={`camera-status-minimal ${student.cameraEnabled ? 'active' : 'inactive'}`}>
                      {student.cameraEnabled ? '📹' : '📴'}
                    </span>
                    <div className="student-indicators">
                      {Object.entries(detectionSettings[student.socketId] || {}).map(([key, value]) => {
                        if (key !== 'customMessage' && value && !['maxAttempts', 'autoDisconnect'].includes(key)) {
                          return <span key={key} className="detection-indicator" title={key}>•</span>;
                        }
                        return null;
                      })}
                    </div>
                    <button className="expand-btn-minimal">
                      {expandedStudent === student.socketId ? '▲' : '▼'}
                    </button>
                  </div>
                </div>

                {/* Expanded Controls */}
                {expandedStudent === student.socketId && (
                  <div className="student-detailed-controls">
                    {/* ✅ ADDED: Attempts Management Section */}
                    <div className="attempts-management-section">
                      <h5>🔄 Attempts Management</h5>
                      <div className="attempts-info">
                        <div className="attempts-stats">
                          <span>Current: {attempts?.currentAttempts || 0}</span>
                          <span>Max: {detectionSettings[student.socketId]?.maxAttempts || globalSettings.maxAttempts}</span>
                          <span>Left: {attemptsLeft}</span>
                        </div>
                        <div className="attempts-controls-student">
                          <div className="attempts-input-student">
                            <label>Max Attempts:</label>
                            <input
                              type="number"
                              min="1"
                              max="50"
                              value={detectionSettings[student.socketId]?.maxAttempts || globalSettings.maxAttempts}
                              onChange={(e) => updateStudentMaxAttempts(student.socketId, parseInt(e.target.value) || 10)}
                              className="attempts-input"
                            />
                          </div>
                          <div className="attempts-actions">
                            <button 
                              className="action-btn reset-attempts"
                              onClick={() => resetStudentAttempts(student.socketId)}
                            >
                              🔄 Reset Attempts
                            </button>
                            <button 
                              className="action-btn add-violation"
                              onClick={() => addManualViolation(student.socketId)}
                            >
                              ⚠️ Add Violation
                            </button>
                          </div>
                        </div>
                        <div className="auto-disconnect-toggle">
                          <label>
                            <input
                              type="checkbox"
                              checked={detectionSettings[student.socketId]?.autoDisconnect ?? globalSettings.autoDisconnect}
                              onChange={(e) => {
                                setDetectionSettings(prev => ({
                                  ...prev,
                                  [student.socketId]: {
                                    ...prev[student.socketId],
                                    autoDisconnect: e.target.checked
                                  }
                                }));
                              }}
                            />
                            Auto-disconnect when attempts exhausted
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="apply-settings-section">
                      <button 
                        className="apply-settings-btn"
                        onClick={() => applySettingsToStudent(student.socketId)}
                      >
                        🚀 APPLY THESE SETTINGS TO STUDENT
                      </button>
                      <p className="apply-hint">
                        Student will see these changes immediately and proctoring will be updated
                      </p>
                    </div>

                    {/* Quick Settings */}
                    <div className="quick-settings-section">
                      <h5>⚡ Quick Settings</h5>
                      <div className="quick-settings-grid">
                        <button 
                          className="quick-setting-btn enable-all"
                          onClick={() => {
                            const newSettings = { ...detectionSettings };
                            Object.keys(globalSettings).forEach(key => {
                              if (!['maxAttempts', 'autoDisconnect'].includes(key)) {
                                newSettings[student.socketId] = {
                                  ...newSettings[student.socketId],
                                  [key]: true
                                };
                              }
                            });
                            setDetectionSettings(newSettings);
                            sendCustomDetectionSetting(student.socketId);
                          }}
                        >
                          ✅ Enable All
                        </button>
                        <button 
                          className="quick-setting-btn disable-all"
                          onClick={() => {
                            const newSettings = { ...detectionSettings };
                            Object.keys(globalSettings).forEach(key => {
                              if (!['maxAttempts', 'autoDisconnect'].includes(key)) {
                                newSettings[student.socketId] = {
                                  ...newSettings[student.socketId],
                                  [key]: false
                                };
                              }
                            });
                            setDetectionSettings(newSettings);
                            sendCustomDetectionSetting(student.socketId);
                          }}
                        >
                          ❌ Disable All
                        </button>
                        <button 
                          className="quick-setting-btn reset-student"
                          onClick={() => {
                            const newSettings = { ...detectionSettings };
                            newSettings[student.socketId] = { ...globalSettings, customMessage: '' };
                            setDetectionSettings(newSettings);
                            sendCustomDetectionSetting(student.socketId);
                          }}
                        >
                          🔄 Reset to Global
                        </button>
                      </div>
                    </div>

                    <div className="controls-header">
                      <h4>Detection Controls for {student.name}</h4>
                      <button 
                        className="close-controls-btn"
                        onClick={() => setExpandedStudent(null)}
                      >
                        ✕
                      </button>
                    </div>
                    
                    {/* Individual Detection Toggles */}
                    <div className="detection-toggles-detailed">
                      <h5>Detection Settings</h5>
                      <div className="toggle-grid-detailed">
                        <div className="toggle-item-detailed">
                          <span className="toggle-label-detailed">Face Detection</span>
                          <button 
                            className={`toggle-btn-detailed ${
                              detectionSettings[student.socketId]?.faceDetection ? 'enabled' : 'disabled'
                            }`}
                            onClick={() => toggleStudentDetection(student.socketId, 'faceDetection')}
                          >
                            {getDetectionStatusText(detectionSettings[student.socketId]?.faceDetection)}
                          </button>
                        </div>
                        
                        <div className="toggle-item-detailed">
                          <span className="toggle-label-detailed">Gaze Detection</span>
                          <button 
                            className={`toggle-btn-detailed ${
                              detectionSettings[student.socketId]?.gazeDetection ? 'enabled' : 'disabled'
                            }`}
                            onClick={() => toggleStudentDetection(student.socketId, 'gazeDetection')}
                          >
                            {getDetectionStatusText(detectionSettings[student.socketId]?.gazeDetection)}
                          </button>
                        </div>
                        
                        
                        
                        <div className="toggle-item-detailed">
                          <span className="toggle-label-detailed">Mouth Detection</span>
                          <button 
                            className={`toggle-btn-detailed ${
                              detectionSettings[student.socketId]?.mouthDetection ? 'enabled' : 'disabled'
                            }`}
                            onClick={() => toggleStudentDetection(student.socketId, 'mouthDetection')}
                          >
                            {getDetectionStatusText(detectionSettings[student.socketId]?.mouthDetection)}
                          </button>
                        </div>
                        
                        <div className="toggle-item-detailed">
                          <span className="toggle-label-detailed">Multiple People</span>
                          <button 
                            className={`toggle-btn-detailed ${
                              detectionSettings[student.socketId]?.multiplePeopleDetection ? 'enabled' : 'disabled'
                            }`}
                            onClick={() => toggleStudentDetection(student.socketId, 'multiplePeopleDetection')}
                          >
                            {getDetectionStatusText(detectionSettings[student.socketId]?.multiplePeopleDetection)}
                          </button>
                        </div>
                        
                       
                      </div>
                    </div>

                    {/* Custom Message */}
                    <div className="custom-message-section-detailed">
                      <h5>Custom Message</h5>
                      <div className="message-input-group-detailed">
                        <input
                          type="text"
                          placeholder="Send a custom message or instruction to this student..."
                          value={detectionSettings[student.socketId]?.customMessage || ''}
                          onChange={(e) => updateCustomMessage(student.socketId, e.target.value)}
                          className="message-input-detailed"
                          maxLength={200}
                        />
                        <button 
                          className="send-message-btn-detailed"
                          onClick={() => sendCustomDetectionSetting(student.socketId)}
                          disabled={!socket}
                        >
                          Send Message
                        </button>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="quick-actions-detailed">
                      <h5>Quick Actions</h5>
                      <div className="action-buttons-detailed">
                        <button 
                          className="action-btn-detailed request-camera"
                          onClick={() => {
                            if (socket) {
                              socket.emit('request-student-camera', {
                                studentSocketId: student.socketId,
                                roomId: `exam-${examId}`
                              });
                              alert(`📹 Camera request sent to ${student.name}`);
                            }
                          }}
                        >
                          📹 Request Camera Access
                        </button>
                      </div>
                    </div>

                    {/* ✅ ADDED: Violation History */}
                    {attempts?.history && attempts.history.length > 0 && (
                      <div className="violation-history-section">
                        <h5>⚠️ Violation History</h5>
                        <div className="violation-history">
                          {attempts.history.slice().reverse().map((violation, idx) => (
                            <div key={idx} className="violation-item">
                              <span className="violation-time">
                                {new Date(violation.timestamp).toLocaleTimeString()}
                              </span>
                              <span className="violation-type">{violation.violationType}</span>
                              <span className="violation-attempts">
                                {violation.attemptsUsed}/{violation.attemptsLeft}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}