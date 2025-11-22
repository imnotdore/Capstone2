import { useState, useEffect } from 'react';
import { FaSave, FaBell, FaEnvelope, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import api from '../lib/api';
import './NotificationSettings.css';

const NotificationSettings = () => {
  const [settings, setSettings] = useState({
    // Email notifications
    emailNotifications: true,
    emailComments: true,
    emailCommentMentions: true,
    emailPrivateComments: true,
    emailTeacherPosts: true,
    emailReturnedWork: true,
    emailInvitations: true,
    emailDueReminders: true,
    
    // Push notifications
    pushNotifications: true,
    pushComments: true,
    pushCommentMentions: true,
    pushPrivateComments: true,
    pushTeacherPosts: true,
    pushReturnedWork: true,
    pushInvitations: true,
    pushDueReminders: true,
    
    // Class-specific settings
    classSettings: {}
  });
  
  const [classes, setClasses] = useState([]);
  const [expandedSections, setExpandedSections] = useState({
    email: true,
    push: false,
    classes: false
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchUserSettings();
    fetchUserClasses();
  }, []);

  const fetchUserSettings = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data.success) {
        const userData = response.data;
        setSettings(prev => ({
          ...prev,
          ...userData.notificationPreferences
        }));
      }
    } catch (error) {
      console.error('Failed to fetch user settings:', error);
    }
  };

  const fetchUserClasses = async () => {
    try {
      const response = await api.get('/class/my-classes');
      if (response.data.success) {
        setClasses(response.data.data || response.data);
        
        // Initialize class settings
        const classSettings = {};
        (response.data.data || response.data).forEach(classData => {
          classSettings[classData._id] = {
            email: true,
            push: true,
            muted: false
          };
        });
        
        setSettings(prev => ({
          ...prev,
          classSettings
        }));
      }
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleClassSettingChange = (classId, key, value) => {
    setSettings(prev => ({
      ...prev,
      classSettings: {
        ...prev.classSettings,
        [classId]: {
          ...prev.classSettings[classId],
          [key]: value
        }
      }
    }));
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage('');
    
    try {
      const response = await api.put('/auth/notification-preferences', {
        notificationPreferences: settings
      });
      
      if (response.data.success) {
        setMessage('Settings saved successfully!');
      } else {
        setMessage('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleAllEmail = (enabled) => {
    setSettings(prev => ({
      ...prev,
      emailComments: enabled,
      emailCommentMentions: enabled,
      emailPrivateComments: enabled,
      emailTeacherPosts: enabled,
      emailReturnedWork: enabled,
      emailInvitations: enabled,
      emailDueReminders: enabled
    }));
  };

  const toggleAllPush = (enabled) => {
    setSettings(prev => ({
      ...prev,
      pushComments: enabled,
      pushCommentMentions: enabled,
      pushPrivateComments: enabled,
      pushTeacherPosts: enabled,
      pushReturnedWork: enabled,
      pushInvitations: enabled,
      pushDueReminders: enabled
    }));
  };

  return (
    <div className="notification-settings">
      <div className="settings-header">
        <h1>Notification Settings</h1>
        <p>Manage how and when you receive notifications</p>
      </div>

      {message && (
        <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}

      <div className="settings-sections">
        {/* Email Notifications Section */}
        <div className="settings-section">
          <div className="section-header" onClick={() => toggleSection('email')}>
            <div className="section-title">
              <FaEnvelope className="section-icon" />
              <h2>Email Notifications</h2>
            </div>
            <div className="section-toggle">
              {expandedSections.email ? <FaChevronUp /> : <FaChevronDown />}
            </div>
          </div>

          {expandedSections.email && (
            <div className="section-content">
              <div className="global-toggle">
                <label className="toggle-label">
                  <span>Allow email notifications</span>
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications}
                    onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <p className="toggle-description">
                  These settings apply to notifications you receive by email.
                </p>
              </div>

              {settings.emailNotifications && (
                <div className="notification-options">
                  <div className="bulk-actions">
                    <button 
                      className="bulk-btn"
                      onClick={() => toggleAllEmail(true)}
                    >
                      Enable All
                    </button>
                    <button 
                      className="bulk-btn"
                      onClick={() => toggleAllEmail(false)}
                    >
                      Disable All
                    </button>
                  </div>

                  <div className="option-group">
                    <h4>Comments</h4>
                    <div className="option-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.emailComments}
                          onChange={(e) => handleSettingChange('emailComments', e.target.checked)}
                        />
                        Comments
                      </label>
                    </div>
                    <div className="option-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.emailCommentMentions}
                          onChange={(e) => handleSettingChange('emailCommentMentions', e.target.checked)}
                        />
                        Comments that mention you
                      </label>
                    </div>
                    <div className="option-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.emailPrivateComments}
                          onChange={(e) => handleSettingChange('emailPrivateComments', e.target.checked)}
                        />
                        Private comments on work
                      </label>
                    </div>
                  </div>

                  <div className="option-group">
                    <h4>Classes that you're enrolled in</h4>
                    <div className="option-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.emailTeacherPosts}
                          onChange={(e) => handleSettingChange('emailTeacherPosts', e.target.checked)}
                        />
                        Work and other posts from teachers
                      </label>
                    </div>
                    <div className="option-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.emailReturnedWork}
                          onChange={(e) => handleSettingChange('emailReturnedWork', e.target.checked)}
                        />
                        Returned work and marks from your teachers
                      </label>
                    </div>
                    <div className="option-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.emailInvitations}
                          onChange={(e) => handleSettingChange('emailInvitations', e.target.checked)}
                        />
                        Invitations to join classes as a student
                      </label>
                    </div>
                    <div className="option-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.emailDueReminders}
                          onChange={(e) => handleSettingChange('emailDueReminders', e.target.checked)}
                        />
                        Due-date reminders for your work
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Push Notifications Section */}
        <div className="settings-section">
          <div className="section-header" onClick={() => toggleSection('push')}>
            <div className="section-title">
              <FaBell className="section-icon" />
              <h2>Push Notifications</h2>
            </div>
            <div className="section-toggle">
              {expandedSections.push ? <FaChevronUp /> : <FaChevronDown />}
            </div>
          </div>

          {expandedSections.push && (
            <div className="section-content">
              <div className="global-toggle">
                <label className="toggle-label">
                  <span>Allow push notifications</span>
                  <input
                    type="checkbox"
                    checked={settings.pushNotifications}
                    onChange={(e) => handleSettingChange('pushNotifications', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <p className="toggle-description">
                  These settings apply to notifications you receive in the app.
                </p>
              </div>

              {settings.pushNotifications && (
                <div className="notification-options">
                  <div className="bulk-actions">
                    <button 
                      className="bulk-btn"
                      onClick={() => toggleAllPush(true)}
                    >
                      Enable All
                    </button>
                    <button 
                      className="bulk-btn"
                      onClick={() => toggleAllPush(false)}
                    >
                      Disable All
                    </button>
                  </div>

                  <div className="option-group">
                    <h4>Comments</h4>
                    <div className="option-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.pushComments}
                          onChange={(e) => handleSettingChange('pushComments', e.target.checked)}
                        />
                        Comments
                      </label>
                    </div>
                    <div className="option-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.pushCommentMentions}
                          onChange={(e) => handleSettingChange('pushCommentMentions', e.target.checked)}
                        />
                        Comments that mention you
                      </label>
                    </div>
                    <div className="option-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.pushPrivateComments}
                          onChange={(e) => handleSettingChange('pushPrivateComments', e.target.checked)}
                        />
                        Private comments on work
                      </label>
                    </div>
                  </div>

                  <div className="option-group">
                    <h4>Classes that you're enrolled in</h4>
                    <div className="option-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.pushTeacherPosts}
                          onChange={(e) => handleSettingChange('pushTeacherPosts', e.target.checked)}
                        />
                        Work and other posts from teachers
                      </label>
                    </div>
                    <div className="option-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.pushReturnedWork}
                          onChange={(e) => handleSettingChange('pushReturnedWork', e.target.checked)}
                        />
                        Returned work and marks from your teachers
                      </label>
                    </div>
                    <div className="option-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.pushInvitations}
                          onChange={(e) => handleSettingChange('pushInvitations', e.target.checked)}
                        />
                        Invitations to join classes as a student
                      </label>
                    </div>
                    <div className="option-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={settings.pushDueReminders}
                          onChange={(e) => handleSettingChange('pushDueReminders', e.target.checked)}
                        />
                        Due-date reminders for your work
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Class Notifications Section */}
        <div className="settings-section">
          <div className="section-header" onClick={() => toggleSection('classes')}>
            <div className="section-title">
              <FaBell className="section-icon" />
              <h2>Class Notifications</h2>
            </div>
            <div className="section-toggle">
              {expandedSections.classes ? <FaChevronUp /> : <FaChevronDown />}
            </div>
          </div>

          {expandedSections.classes && (
            <div className="section-content">
              <p className="section-description">
                These settings apply to both email and push notifications for each class.
              </p>

              <div className="classes-list">
                {classes.map(classData => (
                  <div key={classData._id} className="class-notification-item">
                    <div className="class-info">
                      <h4>{classData.name}</h4>
                      <span className="class-code">{classData.code}</span>
                    </div>
                    <div className="class-settings">
                      <label className="mute-toggle">
                        <input
                          type="checkbox"
                          checked={!settings.classSettings[classData._id]?.muted}
                          onChange={(e) => handleClassSettingChange(
                            classData._id, 
                            'muted', 
                            !e.target.checked
                          )}
                        />
                        <span className="toggle-slider"></span>
                        <span className="mute-label">
                          {settings.classSettings[classData._id]?.muted ? 'Muted' : 'Active'}
                        </span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="settings-actions">
        <button 
          className="save-btn"
          onClick={saveSettings}
          disabled={saving}
        >
          <FaSave className="btn-icon" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default NotificationSettings;