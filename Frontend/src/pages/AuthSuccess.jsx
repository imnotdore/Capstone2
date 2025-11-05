// src/pages/AuthSuccess.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import styles from './AuthSuccess.module.css';

export default function AuthSuccess() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processing...');

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

        // Optional: Verify token with backend
        try {
          const response = await api.get('/auth/me');
          console.log('✅ User verified:', response.data);
        } catch (error) {
          console.warn('⚠️ Token verification failed, but proceeding...');
        }

        setStatus('✅ Login successful! Redirecting...');

        // ✅ ALWAYS REDIRECT TO SINGLE DASHBOARD
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);

      } catch (error) {
        console.error('❌ AuthSuccess error:', error);
        setStatus('❌ Authentication failed. Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      }
    };

    handleAuthSuccess();
  }, [navigate]);

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