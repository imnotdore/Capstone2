import { useState, useEffect } from 'react';
import { FaCheck, FaExternalLinkAlt, FaTimes, FaBellSlash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import './NotificationDropdown.css';

const NotificationDropdown = ({ 
  notifications, 
  loading, 
  onNotificationClick, 
  onMarkAllAsRead, 
  onClose 
}) => {
  const [localNotifications, setLocalNotifications] = useState(notifications);
  const navigate = useNavigate();

  useEffect(() => {
    setLocalNotifications(notifications);
  }, [notifications]);

  const handleNotificationClick = (notification) => {
    onNotificationClick(notification._id);
    
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
    
    onClose();
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      announcement: '📢',
      assignment: '📝',
      quiz_exam: '🎯',
      submission: '📤',
      comment: '💬',
      grade: '⭐',
      invitation: '📨',
      due_reminder: '⏰',
      system: '🔔'
    };
    return icons[type] || '🔔';
  };

  if (loading) {
    return (
      <div className="notification-dropdown">
        <div className="dropdown-header">
          <h3>Notifications</h3>
          <button className="close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
        <div className="loading-notifications">
          <div className="loading-spinner"></div>
          <p>Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notification-dropdown">
      <div className="dropdown-header">
        <h3>Notifications</h3>
        <div className="header-actions">
          {localNotifications.some(n => !n.isRead) && (
            <button 
              className="mark-all-read-btn"
              onClick={onMarkAllAsRead}
              title="Mark all as read"
            >
              <FaCheck />
            </button>
          )}
          <button className="close-btn" onClick={onClose}>
            <FaTimes />
          </button>
        </div>
      </div>

      <div className="notifications-list">
        {localNotifications.length === 0 ? (
          <div className="empty-notifications">
            <FaBellSlash className="empty-icon" />
            <p>No notifications</p>
            <span>You're all caught up!</span>
          </div>
        ) : (
          localNotifications.map(notification => (
            <div
              key={notification._id}
              className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="notification-icon">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="notification-content">
                <div className="notification-title">
                  {notification.title}
                </div>
                <div className="notification-message">
                  {notification.message}
                </div>
                <div className="notification-meta">
                  <span className="notification-time">
                    {formatTime(notification.createdAt)}
                  </span>
                  {notification.classId && (
                    <span className="notification-class">
                      {notification.classId.name}
                    </span>
                  )}
                </div>
              </div>
              {!notification.isRead && (
                <div className="unread-indicator"></div>
              )}
            </div>
          ))
        )}
      </div>

      {localNotifications.length > 0 && (
        <div className="dropdown-footer">
          <button 
            className="view-all-btn"
            onClick={() => {
              navigate('/notifications');
              onClose();
            }}
          >
            View All Notifications
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;