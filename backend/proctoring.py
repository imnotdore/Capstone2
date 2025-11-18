from flask import Flask, request, jsonify
import cv2
import numpy as np
import base64
from flask_cors import CORS
import time
import os
import traceback

app = Flask(__name__)
CORS(app)

# Load cascades
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')

# Enhanced eye detection for glasses
def detect_eyes_with_glasses(face_roi_gray):
    """Enhanced eye detection that works with glasses"""
    eyes = []
    
    # Try different parameters for better detection
    try:
        # Standard eye detection
        eyes = eye_cascade.detectMultiScale(
            face_roi_gray, 
            scaleFactor=1.1, 
            minNeighbors=3, 
            minSize=(15, 15)
        )
        
        # If no eyes detected, try with different parameters for glasses
        if len(eyes) == 0:
            eyes = eye_cascade.detectMultiScale(
                face_roi_gray,
                scaleFactor=1.05,
                minNeighbors=2,
                minSize=(20, 20),
                maxSize=(80, 80)
            )
            
    except Exception as e:
        print(f"Eye detection error: {e}")
    
    return eyes

# Enhanced face detection for masks
def detect_faces_with_masks(gray):
    """Enhanced face detection that works with masks"""
    faces = []
    
    try:
        # Standard face detection
        faces = face_cascade.detectMultiScale(
            gray, 
            scaleFactor=1.1, 
            minNeighbors=5, 
            minSize=(60, 60)
        )
        
        # If no faces detected, try with different parameters
        if len(faces) == 0:
            faces = face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.05,
                minNeighbors=3,
                minSize=(50, 50)
            )
            
    except Exception as e:
        print(f"Face detection error: {e}")
    
    return faces

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'OK', 'message': 'Proctoring server is running'})

@app.route('/detect-faces', methods=['POST'])
def detect_faces():
    try:
        data = request.json
        if 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400

        # Decode base64 image
        image_data = data['image'].split(',')[1] if ',' in data['image'] else data['image']
        img_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return jsonify({'error': 'Could not decode image'}), 400

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Enhanced face detection
        faces = detect_faces_with_masks(gray)

        suspicious = []
        face_detected = len(faces) > 0
        eye_detected = False
        looking_away_count = 0
        looking_forward_count = 0

        debug_img = img.copy()

        if face_detected:
            for (x, y, w, h) in faces:
                # Draw face rectangle
                cv2.rectangle(debug_img, (x, y), (x+w, y+h), (0, 255, 0), 2)

                # Enhanced eye detection for glasses
                face_roi_gray = gray[y:y+h, x:x+w]
                face_roi_gray = cv2.equalizeHist(face_roi_gray)
                eyes = detect_eyes_with_glasses(face_roi_gray)

                gaze_forward = False
                if len(eyes) >= 1:  # Require at least one eye detected
                    eye_detected = True
                    
                    # Draw eyes rectangles
                    for (ex, ey, ew, eh) in eyes:
                        cv2.rectangle(debug_img, (x+ex, y+ey), (x+ex+ew, y+ey+eh), (255, 0, 0), 2)

                    # Enhanced gaze estimation that works with single eye
                    if len(eyes) >= 2:
                        # Two eyes detected - normal gaze estimation
                        eye_centers_x = [ex + ew/2 for (ex, ey, ew, eh) in eyes]
                        avg_eye_center_x = sum(eye_centers_x) / len(eye_centers_x)
                        face_center_x = w / 2
                        deviation_ratio = abs(avg_eye_center_x - face_center_x) / (w / 2)
                        gaze_forward = deviation_ratio <= 0.3
                    else:
                        # Single eye detected - assume forward gaze to reduce false positives
                        gaze_forward = True

                # Update looking away/forward counters
                if gaze_forward:
                    looking_forward_count += 1
                else:
                    looking_away_count += 1

            # Suspicious messages (reduced sensitivity)
            if not eye_detected and len(faces) > 0:
                suspicious.append("😑 Eyes not clearly visible")
            if looking_away_count > 0:
                suspicious.append(f"👀 Possible distraction detected")
            if len(faces) > 1:
                suspicious.append("⚠️ Multiple faces detected")
        else:
            suspicious.append("❌ Face not clearly visible")

        # Encode debug image
        _, buffer = cv2.imencode('.jpg', debug_img)
        debug_image_b64 = base64.b64encode(buffer).decode('utf-8')

        return jsonify({
            'faceCount': len(faces),
            'faceDetected': face_detected,
            'eyeDetected': eye_detected,
            'facesLookingAway': looking_away_count,
            'facesLookingForward': looking_forward_count,
            'suspiciousActivities': suspicious,
            'timestamp': time.strftime("%Y-%m-%d %H:%M:%S"),
            'debugImage': f"data:image/jpeg;base64,{debug_image_b64}"
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("🚀 Starting Enhanced Exam Proctoring Server...")
    print("✅ Better detection for glasses and face masks")
    app.run(host='0.0.0.0', port=5000, debug=True)