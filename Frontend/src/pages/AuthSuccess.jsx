// src/pages/AuthSuccess.jsx - UPDATED
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import RoleSelectionModal from './RoleSelectionModal'; // ADD THIS
import styles from './AuthSuccess.module.css';

export default function AuthSuccess() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processing...');
  const [user, setUser] = useState(null); // ADD THIS
  const [showRoleModal, setShowRoleModal] = useState(false); // ADD THIS

  useEffect(() => {
    const handleAuthSuccess = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        console.log('🔄 AuthSuccess - Token received:', !!token);

        if (!token) {
          setStatus('❌ Missing token. Redirecting to login...');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        // Save to localStorage
        localStorage.setItem('token', token);

        console.log('✅ Token saved to localStorage');

        // Get user data to check if role is already set
        try {
          const response = await api.get('/auth/me');
          console.log('✅ User verified:', response.data);
          setUser(response.data);
          
          // Check if user already has a role
          const existingRole = localStorage.getItem('userRole');
          if (existingRole || response.data.role) {
            // User already has a role, go directly to dashboard
            console.log('✅ User already has role, redirecting to dashboard');
            navigate('/dashboard');
          } else {
            // Show role selection modal
            console.log('🔄 No role set, showing role selection');
            setShowRoleModal(true);
          }
        } catch (error) {
          console.warn('⚠️ Token verification failed, but proceeding...');
          // If we can't verify, still show role selection
          setShowRoleModal(true);
        }

      } catch (error) {
        console.error('❌ AuthSuccess error:', error);
        setStatus('❌ Authentication failed. Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      }
    };

    handleAuthSuccess();
  }, [navigate]);

  if (showRoleModal && user) {
    return <RoleSelectionModal user={user} />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.spinner}></div>
        <h2 className={styles.title}>Authentication Successful</h2>
        <p className={styles.status}>{status}</p>
        <p className={styles.note}>Please wait while we redirect you...</p>
      </div>
    </div>
  );
}