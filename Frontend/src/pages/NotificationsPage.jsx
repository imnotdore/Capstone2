import { useState, useEffect } from 'react';
import { FaCheck, FaTrash, FaBell, FaFilter, FaSearch } from 'react-icons/fa';
import api from '../lib/api';
import './NotificationsPage.css';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await api.get('/notifications?limit=50');
      if (response.data.success) {
        setNotifications(response.data.data.notifications);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(notif =>
          notif._id === notificationId
            ? { ...notif, isRead: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, isRead: true }))
      );
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications(prev =>
        prev.filter(notif => notif._id !== notificationId)
      );
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const clearAll = async () => {
    if (window.confirm('Are you sure you want to clear all notifications?')) {
      try {
        await api.delete('/notifications');
        setNotifications([]);
      } catch (error) {
        console.error('Failed to clear notifications:', error);
      }
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

  const filteredNotifications = notifications.filter(notification => {
    // Apply filter
    if (filter === 'unread' && notification.isRead) return false;
    if (filter === 'read' && !notification.isRead) return false;
    
    // Apply search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        notification.title.toLowerCase().includes(searchLower) ||
        notification.message.toLowerCase().includes(searchLower) ||
        (notification.classId?.name?.toLowerCase().includes(searchLower))
      );
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="notifications-page">
        <div className="loading-notifications">
          <div className="loading-spinner"></div>
          <p>Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <div className="header-content">
          <h1>
            <FaBell className="header-icon" />
            Notifications
          </h1>
          <p>Manage your notifications and preferences</p>
        </div>
        
        <div className="header-actions">
          {notifications.some(n => !n.isRead) && (
            <button className="mark-all-read-btn" onClick={markAllAsRead}>
              <FaCheck />
              Mark All as Read
            </button>
          )}
          <button className="clear-all-btn" onClick={clearAll}>
            <FaTrash />
            Clear All
          </button>
        </div>
      </div>

      <div className="notifications-controls">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread
          </button>
          <button
            className={`filter-btn ${filter === 'read' ? 'active' : ''}`}
            onClick={() => setFilter('read')}
          >
            Read
          </button>
        </div>
      </div>

      <div className="notifications-list">
        {filteredNotifications.length === 0 ? (
          <div className="empty-notifications">
            <FaBell className="empty-icon" />
            <h3>No notifications found</h3>
            <p>
              {searchTerm || filter !== 'all' 
                ? 'Try adjusting your search or filter' 
                : "You're all caught up! New notifications will appear here."}
            </p>
          </div>
        ) : (
          filteredNotifications.map(notification => (
            <div
              key={notification._id}
              className={`notification-card ${!notification.isRead ? 'unread' : ''}`}
            >
              <div className="notification-icon">
                {getNotificationIcon(notification.type)}
              </div>
              
              <div className="notification-content">
                <div className="notification-header">
                  <h3 className="notification-title">
                    {notification.title}
                  </h3>
                  <div className="notification-actions">
                    {!notification.isRead && (
                      <button
                        className="action-btn read-btn"
                        onClick={() => markAsRead(notification._id)}
                        title="Mark as read"
                      >
                        <FaCheck />
                      </button>
                    )}
                    <button
                      className="action-btn delete-btn"
                      onClick={() => deleteNotification(notification._id)}
                      title="Delete notification"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
                
                <p className="notification-message">
                  {notification.message}
                </p>
                
                <div className="notification-meta">
                  <span className="notification-time">
                    {formatTime(notification.createdAt)}
                  </span>
                  {notification.classId && (
                    <span className="notification-class">
                      {notification.classId.name}
                    </span>
                  )}
                  {notification.priority === 'high' && (
                    <span className="priority-badge high">High Priority</span>
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
    </div>
  );
};

export default NotificationsPage;