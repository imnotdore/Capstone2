// src/utils/cameraUtils.js - IMPROVED VERSION
const CameraUtils = {
  async checkCameraAvailability() {
    try {
      console.log('🔍 Checking camera availability...');
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return {
          available: false,
          error: 'Camera API not supported in this browser. Try using Chrome, Firefox, or Edge.'
        };
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      
      console.log('📷 Found cameras:', cameras);
      
      if (cameras.length === 0) {
        return {
          available: false,
          error: 'No camera found on this device. Please connect a camera and try again.'
        };
      }

      // Test actual camera access with timeout
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true 
        }, { signal: controller.signal });
        
        clearTimeout(timeoutId);
        stream.getTracks().forEach(track => track.stop());
        
        return {
          available: true,
          devices: cameras,
          deviceCount: cameras.length
        };
      } catch (accessError) {
        if (accessError.name === 'AbortError') {
          return {
            available: false,
            error: 'Camera access timeout. Please check your camera connection.'
          };
        }
        return {
          available: false,
          error: `Camera access denied: ${accessError.message}. Please allow camera permissions.`
        };
      }

    } catch (error) {
      console.error('Camera check failed:', error);
      return {
        available: false,
        error: error.message || 'Unknown camera error'
      };
    }
  },

  async getCameraStream(constraints = null) {
    try {
      const defaultConstraints = { 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      };
      
      return await navigator.mediaDevices.getUserMedia(constraints || defaultConstraints);
    } catch (error) {
      console.error('Failed to get camera stream:', error);
      
      // Provide more specific error messages
      let userMessage = `Camera access failed: ${error.message}`;
      
      if (error.name === 'NotAllowedError') {
        userMessage = 'Camera permission denied. Please allow camera access in your browser settings and refresh the page.';
      } else if (error.name === 'NotFoundError') {
        userMessage = 'No camera found. Please connect a camera and try again.';
      } else if (error.name === 'NotReadableError') {
        userMessage = 'Camera is in use by another application. Please close other apps that might be using the camera.';
      }
      
      throw new Error(userMessage);
    }
  },

  stopCameraStream(stream) {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
    }
  }
};

export default CameraUtils;