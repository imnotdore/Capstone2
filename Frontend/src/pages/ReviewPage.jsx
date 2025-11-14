// src/pages/ReviewPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaCheckCircle, FaClock, FaComment } from 'react-icons/fa';
import './ReviewPage.css'; // We'll create this CSS file

export default function ReviewPage() {
  const navigate = useNavigate();

  // Mock data for items to review
  const reviewItems = [
    {
      id: 1,
      title: 'Midterm Exam Submission',
      student: 'John Doe',
      class: 'SYSARCH - BSIT-3A',
      submitted: '2 hours ago',
      type: 'exam',
      status: 'pending'
    },
    {
      id: 2,
      title: 'Chapter 5 Assignment',
      student: 'Jane Smith',
      class: 'SYSARCH - BSIT-3A',
      submitted: '1 day ago',
      type: 'assignment',
      status: 'pending'
    },
    {
      id: 3,
      title: 'Final Project Proposal',
      student: 'Mike Johnson',
      class: 'SYSARCH - BSIT-3A',
      submitted: '3 days ago',
      type: 'project',
      status: 'pending'
    }
  ];

  const handleReviewItem = (itemId) => {
    // Navigate to grading interface for this item
    alert(`Reviewing item ${itemId} - This would open the grading interface`);
  };

  const handleMarkAsReviewed = (itemId, event) => {
    event.stopPropagation();
    alert(`Marking item ${itemId} as reviewed`);
    // Here you would update the status in your backend
  };

  return (
    <div className="review-page">
      {/* Header */}
      <div className="review-header">
        <div className="header-left">
          <button 
            className="back-btn"
            onClick={() => navigate('/dashboard')}
          >
            <FaArrowLeft className="back-icon" />
            Back
          </button>
        </div>
        <div className="header-center">
          <h1 className="page-title">Items to Review</h1>
          <p className="page-subtitle">Review and grade student submissions</p>
        </div>
        <div className="header-right">
          <div className="review-stats">
            <span className="stat-badge">{reviewItems.length} items</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="review-content">
        {reviewItems.length > 0 ? (
          <div className="review-items-container">
            <div className="review-items-header">
              <h2>Submissions Needing Review</h2>
              <div className="filter-options">
                <select className="filter-select">
                  <option value="all">All classes</option>
                  <option value="sysarch">SYSARCH - BSIT-3A</option>
                </select>
              </div>
            </div>

            <div className="review-items-list">
              {reviewItems.map((item) => (
                <div 
                  key={item.id} 
                  className="review-item-card"
                  onClick={() => handleReviewItem(item.id)}
                >
                  <div className="item-header">
                    <div className="item-type-badge">
                      {item.type === 'exam' && '📝 Exam'}
                      {item.type === 'assignment' && '📋 Assignment'}
                      {item.type === 'project' && '🚀 Project'}
                    </div>
                    <span className="submission-time">{item.submitted}</span>
                  </div>
                  
                  <div className="item-content">
                    <h3 className="item-title">{item.title}</h3>
                    <div className="item-details">
                      <div className="student-info">
                        <span className="student-name">{item.student}</span>
                        <span className="class-name">{item.class}</span>
                      </div>
                    </div>
                  </div>

                  <div className="item-actions">
                    <button 
                      className="review-btn primary"
                      onClick={() => handleReviewItem(item.id)}
                    >
                      <FaComment className="btn-icon" />
                      Review
                    </button>
                    <button 
                      className="review-btn secondary"
                      onClick={(e) => handleMarkAsReviewed(item.id, e)}
                    >
                      <FaCheckCircle className="btn-icon" />
                      Mark as Reviewed
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="review-empty">
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <h3>No items to review</h3>
              <p>When students submit work that needs grading, it will appear here.</p>
              <div className="empty-actions">
                <button 
                  className="primary-btn"
                  onClick={() => navigate('/dashboard')}
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recently Reviewed Section */}
        <div className="recently-reviewed">
          <h3>Recently Reviewed</h3>
          <div className="recent-items">
            <div className="recent-item">
              <FaCheckCircle className="checked-icon" />
              <span>Quiz 1 - All students graded</span>
              <span className="recent-time">2 hours ago</span>
            </div>
            <div className="recent-item">
              <FaCheckCircle className="checked-icon" />
              <span>Assignment 3 - 15/20 graded</span>
              <span className="recent-time">1 day ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}