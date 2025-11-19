// src/lib/cameraService.js
class CameraService {
  constructor() {
    this.stream = null;
    this.videoRef = null;
    this.onCameraStateChange = null;
  }

  // Check camera availability
  async checkCameraAvailability() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        throw new Error('No camera found on this device');
      }

      return {
        available: true,
        devices: videoDevices,
        hasCamera: videoDevices.length > 0
      };
    } catch (error) {
      console.error('Camera availability check failed:', error);
      return {
        available: false,
        error: error.message,
        hasCamera: false
      };
    }
  }

  // Initialize camera with better error handling
  async initializeCamera(videoRef, onStateChange = null) {
    try {
      this.videoRef = videoRef;
      this.onCameraStateChange = onStateChange;

      // Check camera availability first
      const cameraCheck = await this.checkCameraAvailability();
      if (!cameraCheck.available) {
        throw new Error(cameraCheck.error || 'Camera not available');
      }

      // Stop any existing stream
      await this.stopCamera();

      // Try different camera configurations
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
          frameRate: { ideal: 24 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      };

      console.log('🎯 Requesting camera with constraints:', constraints);

      // Request camera access
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (!this.stream) {
        throw new Error('Failed to get camera stream');
      }

      // Set up video element
      if (this.videoRef && this.videoRef.current) {
        this.videoRef.current.srcObject = this.stream;
        
        // Wait for video to be ready
        return new Promise((resolve, reject) => {
          if (!this.videoRef.current) {
            reject(new Error('Video reference not available'));
            return;
          }

          this.videoRef.current.onloadedmetadata = () => {
            console.log('✅ Video metadata loaded');
            this.videoRef.current.play()
              .then(() => {
                console.log('✅ Video playback started');
                this.onCameraStateChange?.({
                  connected: true,
                  error: null,
                  stream: this.stream
                });
                resolve(this.stream);
              })
              .catch(reject);
          };

          this.videoRef.current.onerror = (error) => {
            console.error('❌ Video error:', error);
            reject(new Error('Video playback failed'));
          };

          // Set timeout for video loading
          setTimeout(() => {
            if (this.videoRef.current?.readyState >= 2) {
              resolve(this.stream);
            } else {
              reject(new Error('Video loading timeout'));
            }
          }, 5000);
        });
      }

      return this.stream;

    } catch (error) {
      console.error('❌ Camera initialization failed:', error);
      
      let userMessage = 'Camera access failed';
      
      if (error.name === 'NotAllowedError') {
        userMessage = 'Camera access denied. Please allow camera permissions and refresh the page.';
      } else if (error.name === 'NotFoundError') {
        userMessage = 'No camera found. Please connect a camera and try again.';
      } else if (error.name === 'NotReadableError') {
        userMessage = 'Camera is in use by another application. Please close other camera apps.';
      } else if (error.name === 'OverconstrainedError') {
        userMessage = 'Camera constraints could not be satisfied. Trying alternative settings...';
        // Try with simpler constraints
        return this.initializeWithSimpleConstraints(videoRef, onStateChange);
      }

      this.onCameraStateChange?.({
        connected: false,
        error: userMessage,
        stream: null
      });

      throw new Error(userMessage);
    }
  }

  // Try with simpler constraints
  async initializeWithSimpleConstraints(videoRef, onStateChange) {
    try {
      const simpleConstraints = {
        video: {
          facingMode: 'user'
        },
        audio: true
      };

      console.log('🔄 Trying simpler camera constraints...');
      this.stream = await navigator.mediaDevices.getUserMedia(simpleConstraints);
      
      if (this.videoRef && this.videoRef.current) {
        this.videoRef.current.srcObject = this.stream;
        await this.videoRef.current.play();
      }

      this.onCameraStateChange?.({
        connected: true,
        error: null,
        stream: this.stream
      });

      return this.stream;
    } catch (error) {
      console.error('❌ Simple constraints also failed:', error);
      throw error;
    }
  }

  // Stop camera
  async stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
      });
      this.stream = null;
    }

    if (this.videoRef && this.videoRef.current) {
      this.videoRef.current.srcObject = null;
    }

    this.onCameraStateChange?.({
      connected: false,
      error: null,
      stream: null
    });
  }

  // Switch camera
  async switchCamera() {
    try {
      if (!this.stream) return;

      const currentTrack = this.stream.getVideoTracks()[0];
      if (!currentTrack) return;

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length < 2) {
        throw new Error('Only one camera available');
      }

      const currentDeviceId = currentTrack.getSettings().deviceId;
      const otherDevice = videoDevices.find(device => device.deviceId !== currentDeviceId);
      
      if (!otherDevice) return;

      const constraints = {
        video: {
          deviceId: { exact: otherDevice.deviceId }
        },
        audio: true
      };

      await this.stopCamera();
      return await this.initializeCamera(this.videoRef, this.onCameraStateChange);

    } catch (error) {
      console.error('Camera switch failed:', error);
      throw error;
    }
  }

  // Take snapshot
  takeSnapshot() {
    if (!this.videoRef?.current || !this.stream) return null;

    const video = this.videoRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg');
  }

  // Get camera capabilities
  async getCameraCapabilities() {
    try {
      if (!this.stream) return null;

      const track = this.stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities();
      const settings = track.getSettings();

      return {
        capabilities,
        settings,
        label: track.label || 'Camera'
      };
    } catch (error) {
      console.error('Failed to get camera capabilities:', error);
      return null;
    }
  }
}

export default new CameraService();