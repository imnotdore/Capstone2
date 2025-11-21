// Frontend/src/components/PeopleTab.jsx
import { useState, useEffect } from 'react';
import { FaEllipsisV, FaEnvelope, FaUserMinus, FaVolumeMute, FaVolumeUp } from 'react-icons/fa';
import './PeopleTab.css';

const PeopleTab = ({ classId }) => {
  const [peopleData, setPeopleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeActions, setActiveActions] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [emailData, setEmailData] = useState({ subject: '', message: '' });

  useEffect(() => {
    fetchPeopleData();
  }, [classId]);

  const fetchPeopleData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/student-management/${classId}/students`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        setPeopleData(result.data);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Failed to load people data');
      console.error('Error fetching people data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleActions = (personId) => {
    setActiveActions(activeActions === personId ? null : personId);
  };

  const handleRemoveStudent = async (studentId, studentName) => {
    if (!window.confirm(`Are you sure you want to remove ${studentName} from this class?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/student-management/${classId}/students/${studentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        alert('Student removed successfully');
        fetchPeopleData(); // Refresh data
      } else {
        alert('Failed to remove student: ' + result.message);
      }
    } catch (err) {
      alert('Failed to remove student');
      console.error('Error removing student:', err);
    }
  };

  const handleToggleMute = async (studentId, studentName, isCurrentlyMuted) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/student-management/${classId}/students/${studentId}/mute`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        alert(`Student ${isCurrentlyMuted ? 'unmuted' : 'muted'} successfully`);
        fetchPeopleData(); // Refresh data
      } else {
        alert('Failed to update student: ' + result.message);
      }
    } catch (err) {
      alert('Failed to update student');
      console.error('Error toggling mute:', err);
    }
  };

  const handleEmailStudents = async () => {
    if (!emailData.subject.trim() || !emailData.message.trim()) {
      alert('Please enter both subject and message');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/student-management/${classId}/email-students`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentIds: selectedStudents,
          subject: emailData.subject,
          message: emailData.message
        })
      });

      const result = await response.json();

      if (result.success) {
        alert(`Email prepared for ${result.data.recipients} students`);
        setShowEmailModal(false);
        setSelectedStudents([]);
        setEmailData({ subject: '', message: '' });
      } else {
        alert('Failed to send emails: ' + result.message);
      }
    } catch (err) {
      alert('Failed to send emails');
      console.error('Error sending emails:', err);
    }
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllStudents = () => {
    if (selectedStudents.length === peopleData.students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(peopleData.students.map(student => student._id));
    }
  };

  if (loading) return <div className="loading">Loading people...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!peopleData) return <div className="error-message">No data available</div>;

  return (
    <div className="people-tab">
      {/* Teachers Section */}
      <section className="people-section">
        <h3 className="section-title">Teachers</h3>
        <div className="people-list">
          {peopleData.teachers.map(teacher => (
            <div key={teacher._id} className="person-card teacher-card">
              <div className="person-avatar">
                {teacher.name.charAt(0).toUpperCase()}
              </div>
              <div className="person-info">
                <div className="person-name">{teacher.name}</div>
                <div className="person-email">{teacher.email}</div>
                <div className="person-role teacher-role">Teacher</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Students Section */}
      <section className="people-section">
        <div className="section-header">
          <h3 className="section-title">Students ({peopleData.students.length})</h3>
          {peopleData.students.length > 0 && (
            <div className="bulk-actions">
              <button 
                className="bulk-action-btn"
                onClick={() => setShowEmailModal(true)}
              >
                <FaEnvelope /> Email Students
              </button>
            </div>
          )}
        </div>

        {peopleData.students.length > 0 ? (
          <div className="students-container">
            {/* Bulk Selection Header */}
            <div className="bulk-selection-header">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedStudents.length === peopleData.students.length}
                  onChange={selectAllStudents}
                />
                Select All
              </label>
              <span className="selected-count">
                {selectedStudents.length} selected
              </span>
            </div>

            {/* Students List */}
            <div className="people-list">
              {peopleData.students.map(student => (
                <div key={student._id} className="person-card student-card">
                  <div className="student-select">
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student._id)}
                      onChange={() => toggleStudentSelection(student._id)}
                    />
                  </div>
                  <div className="person-avatar">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="person-info">
                    <div className="person-name">
                      {student.name}
                      {student.isMuted && <span className="muted-badge">Muted</span>}
                    </div>
                    <div className="person-email">{student.email}</div>
                    <div className="person-meta">
                      Joined {new Date(student.joinedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="person-actions">
                    <button 
                      className="actions-toggle"
                      onClick={() => toggleActions(student._id)}
                    >
                      <FaEllipsisV />
                    </button>
                    
                    {activeActions === student._id && (
                      <div className="actions-dropdown">
                        <button 
                          className="action-item"
                          onClick={() => handleToggleMute(student._id, student.name, student.isMuted)}
                        >
                          {student.isMuted ? <FaVolumeUp /> : <FaVolumeMute />}
                          {student.isMuted ? 'Unmute' : 'Mute'} Student
                        </button>
                        <button 
                          className="action-item remove"
                          onClick={() => handleRemoveStudent(student._id, student.name)}
                        >
                          <FaUserMinus />
                          Remove from Class
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h4>No Students Yet</h4>
            <p>Students will appear here once they join your class using the class code.</p>
          </div>
        )}
      </section>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Email Students</h3>
              <button 
                className="close-btn"
                onClick={() => setShowEmailModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Sending to {selectedStudents.length} selected students</p>
              <div className="form-group">
                <label>Subject</label>
                <input
                  type="text"
                  placeholder="Enter email subject"
                  value={emailData.subject}
                  onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Message</label>
                <textarea
                  placeholder="Enter your message"
                  rows="6"
                  value={emailData.message}
                  onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button 
                className="btn-secondary"
                onClick={() => setShowEmailModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleEmailStudents}
                disabled={!emailData.subject.trim() || !emailData.message.trim()}
              >
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PeopleTab;