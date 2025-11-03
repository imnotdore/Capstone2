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
hand_path = os.path.join(cv2.data.haarcascades, 'haarcascade_hand.xml')
hand_cascade = cv2.CascadeClassifier(hand_path) if os.path.exists(hand_path) else None

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
        faces = face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(60, 60))

        suspicious = []
        face_detected = len(faces) > 0
        eye_detected = False
        hand_detected = False
        looking_away_count = 0
        looking_back_count = 0

        debug_img = img.copy()

        if face_detected:
            for (x, y, w, h) in faces:
                # Draw face rectangle
                cv2.rectangle(debug_img, (x, y), (x+w, y+h), (0, 255, 0), 2)

                # Eye detection
                face_roi_gray = gray[y:y+h, x:x+w]
                face_roi_gray = cv2.equalizeHist(face_roi_gray)
                eyes = eye_cascade.detectMultiScale(
                    face_roi_gray, scaleFactor=1.1, minNeighbors=3, minSize=(15, 15)
                )

                gaze_forward = False
                if len(eyes) > 0:
                    eye_detected = True
                    # Draw eyes rectangles
                    for (ex, ey, ew, eh) in eyes:
                        cv2.rectangle(debug_img, (x+ex, y+ey), (x+ex+ew, y+ey+eh), (255, 0, 0), 2)

                    # Simple horizontal gaze estimation
                    eye_centers_x = [ex + ew/2 for (ex, ey, ew, eh) in eyes]
                    avg_eye_center_x = sum(eye_centers_x) / len(eye_centers_x)
                    face_center_x = w / 2
                    deviation_ratio = abs(avg_eye_center_x - face_center_x) / (w / 2)
                    if deviation_ratio <= 0.25:
                        gaze_forward = True

                # Update looking away/back counters
                if gaze_forward:
                    looking_back_count += 1
                else:
                    looking_away_count += 1

            # Suspicious messages
            if not eye_detected:
                suspicious.append("😑 Eyes possibly closed")
            if looking_away_count > 0:
                suspicious.append(f"👀 {looking_away_count} face(s) looking away from screen")
            if looking_back_count > 0:
                suspicious.append(f"✅ {looking_back_count} face(s) looking forward at screen")
            if len(faces) > 1:
                suspicious.append("⚠️ Multiple faces detected")
        else:
            suspicious.append("❌ No face detected")

        # Hand detection
        if hand_cascade:
            hands = hand_cascade.detectMultiScale(gray, 1.1, 5, minSize=(60, 60))
            if len(hands) > 0:
                hand_detected = True
                suspicious.append(f"🖐️ {len(hands)} hand(s) detected")
                for (hx, hy, hw, hh) in hands:
                    cv2.rectangle(debug_img, (hx, hy), (hx+hw, hy+hh), (0, 0, 255), 2)

        # Encode debug image
        _, buffer = cv2.imencode('.jpg', debug_img)
        debug_image_b64 = base64.b64encode(buffer).decode('utf-8')

        return jsonify({
            'faceCount': len(faces),
            'faceDetected': face_detected,
            'eyeDetected': eye_detected,
            'handDetected': hand_detected,
            'facesLookingAway': looking_away_count,
            'facesLookingForward': looking_back_count,
            'suspiciousActivities': suspicious,
            'timestamp': time.strftime("%Y-%m-%d %H:%M:%S"),
            'debugImage': f"data:image/jpeg;base64,{debug_image_b64}"
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("🚀 Starting Exam Proctoring Server...")
    app.run(host='0.0.0.0', port=5000, debug=True)
