// src/lib/proctoringService.js - UPDATED VERSION
class ProctoringService {
  constructor() {
    this.baseURL = 'http://localhost:5000';
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.frameCaptureInterval = null;
    this.videoRef = null;
    this.onAlertCallback = null;
    this.serverAvailable = false;
  }

  // Initialize proctoring service - FIXED RESPONSE CHECK
  async initialize(videoRef, onAlertCallback) {
    this.videoRef = videoRef;
    this.onAlertCallback = onAlertCallback;
    
    const isHealthy = await this.checkServerHealth();
    this.serverAvailable = isHealthy;
    
    return isHealthy;
  }

  // Check if Python server is running - FIXED FOR YOUR RESPONSE FORMAT
  async checkServerHealth() {
    try {
      console.log('🔍 Checking proctoring server health...');
      const response = await fetch(`${this.baseURL}/health`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 Proctoring server response:', data);
      
      // Check for both possible success indicators
      const isHealthy = data.success === true || data.status === 'OK';
      
      if (isHealthy) {
        console.log('✅ Proctoring server is available and healthy');
        this.serverAvailable = true;
      } else {
        console.warn('⚠️ Proctoring server returned unsuccessful response');
        this.serverAvailable = false;
      }
      
      return isHealthy;
    } catch (error) {
      console.error('❌ Proctoring server not available:', error);
      this.serverAvailable = false;
      return false;
    }
  }

  // Capture frame from video and send to Python server
  captureFrame() {
    if (!this.videoRef || !this.videoRef.videoWidth || this.videoRef.videoWidth === 0) {
      console.warn('⚠️ Video not ready for frame capture');
      return null;
    }

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = this.videoRef.videoWidth;
      canvas.height = this.videoRef.videoHeight;
      
      ctx.drawImage(this.videoRef, 0, 0, canvas.width, canvas.height);
      
      return canvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
      console.error('❌ Frame capture failed:', error);
      return null;
    }
  }

  // Send frame to Python server for analysis - WITH BETTER ERROR HANDLING
  async analyzeFrame(imageData) {
    if (!this.serverAvailable) {
      console.log('🔄 Proctoring server not available, skipping frame analysis');
      return null;
    }

    try {
      console.log('📸 Sending frame for analysis...');
      const response = await fetch(`${this.baseURL}/detect-faces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageData }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('🤖 Analysis result:', result);
      
      return result;
    } catch (error) {
      console.error('❌ Frame analysis failed:', error);
      
      // Try to reconnect if server was previously available
      if (this.serverAvailable) {
        console.log('🔄 Attempting to reconnect to proctoring server...');
        this.serverAvailable = await this.checkServerHealth();
      }
      
      return null;
    }
  }

  // Start proctoring monitoring - IMPROVED
  startMonitoring() {
    if (this.isMonitoring) {
      console.log('⚠️ Proctoring monitoring already active');
      return;
    }

    this.isMonitoring = true;
    console.log('🚀 Starting proctoring monitoring...');

    // Check server health periodically
    this.monitoringInterval = setInterval(async () => {
      const wasAvailable = this.serverAvailable;
      this.serverAvailable = await this.checkServerHealth();
      
      if (wasAvailable && !this.serverAvailable) {
        this.onAlertCallback?.({
          id: Date.now(),
          message: '❌ Proctoring server disconnected',
          timestamp: new Date().toLocaleTimeString(),
          type: 'error'
        });
      } else if (!wasAvailable && this.serverAvailable) {
        this.onAlertCallback?.({
          id: Date.now(),
          message: '✅ Proctoring server reconnected',
          timestamp: new Date().toLocaleTimeString(),
          type: 'success'
        });
      }
    }, 30000); // Check every 30 seconds

    // Analyze frames periodically - ONLY IF SERVER IS AVAILABLE
    this.frameCaptureInterval = setInterval(async () => {
      if (!this.serverAvailable) {
        return; // Skip if server is not available
      }

      if (!this.videoRef || this.videoRef.readyState !== 4) {
        console.log('⏳ Video not ready, skipping frame analysis');
        return;
      }

      try {
        const frame = this.captureFrame();
        if (!frame) {
          console.log('⏳ No frame captured, skipping analysis');
          return;
        }

        const analysis = await this.analyzeFrame(frame);
        
        if (analysis && analysis.suspiciousActivities && analysis.suspiciousActivities.length > 0) {
          console.log('🚨 Suspicious activities detected:', analysis.suspiciousActivities);
          
          analysis.suspiciousActivities.forEach(activity => {
            this.onAlertCallback?.({
              id: Date.now() + Math.random(),
              message: activity,
              timestamp: new Date().toLocaleTimeString(),
              type: 'warning',
              analysisData: analysis
            });
          });
        }

        // Alert if no face detected for consecutive frames
        if (analysis && !analysis.faceDetected) {
          this.onAlertCallback?.({
            id: Date.now(),
            message: '❌ Face not detected - please position yourself in frame',
            timestamp: new Date().toLocaleTimeString(),
            type: 'warning',
            analysisData: analysis
          });
        }

      } catch (error) {
        console.error('❌ Frame analysis error:', error);
      }
    }, 5000); // Analyze every 5 seconds
  }

  // Stop proctoring monitoring
  stopMonitoring() {
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    if (this.frameCaptureInterval) {
      clearInterval(this.frameCaptureInterval);
      this.frameCaptureInterval = null;
    }
    
    console.log('🛑 Proctoring monitoring stopped');
  }

  // Get server status
  getServerStatus() {
    return {
      available: this.serverAvailable,
      monitoring: this.isMonitoring
    };
  }

  // Manual server check
  async manualHealthCheck() {
    return await this.checkServerHealth();
  }

  // Cleanup
  cleanup() {
    this.stopMonitoring();
    this.videoRef = null;
    this.onAlertCallback = null;
    this.serverAvailable = false;
  }
}

export default new ProctoringService();