import os
os.environ['GLOG_minloglevel'] = '2'  # Suppress warnings

from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64
import mediapipe as mp
from datetime import datetime

app = Flask(__name__)
CORS(app)

# MediaPipe Init - BALANCED VERSION
mp_face_detection = mp.solutions.face_detection
mp_face_mesh = mp.solutions.face_mesh
mp_hands = mp.solutions.hands

# Balanced confidence levels
face_detector = mp_face_detection.FaceDetection(
    model_selection=0,
    min_detection_confidence=0.5
)

face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

hand_detector = mp_hands.Hands(
    model_complexity=0,
    max_num_hands=2,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

def decode_image(image_base64):
    """Decode base64 → OpenCV image"""
    try:
        image_data = image_base64.split(',')[1] if "," in image_base64 else image_base64
        img_bytes = base64.b64decode(image_data)
        img_np = np.frombuffer(img_bytes, np.uint8)
        return cv2.imdecode(img_np, cv2.IMREAD_COLOR)
    except Exception as e:
        print(f"Image decode error: {e}")
        return None

def get_gaze_direction_fixed(face_landmarks, w, h):
    """FIXED gaze detection - corrected direction logic"""
    try:
        # Use reliable eye landmarks
        left_eye = face_landmarks.landmark[33]    # Left eye outer corner
        right_eye = face_landmarks.landmark[263]  # Right eye outer corner
        nose_tip = face_landmarks.landmark[1]     # Nose tip
        
        # Calculate eye center in pixels
        eye_center_x = ((left_eye.x + right_eye.x) / 2) * w
        
        # FIXED LOGIC: When you look right, eye_center_x moves left (relative to screen)
        gaze = "forward"
        
        # CORRECTED thresholds - when you look right, your eyes move left on screen
        if eye_center_x < w * 0.2:    # Eyes moved left = looking RIGHT
            gaze = "looking right"
        elif eye_center_x > w * 0.6:  # Eyes moved right = looking LEFT  
            gaze = "looking left"
        
        # Simple eye openness check
        left_eye_vertical = abs(face_landmarks.landmark[159].y - face_landmarks.landmark[145].y)
        right_eye_vertical = abs(face_landmarks.landmark[386].y - face_landmarks.landmark[374].y)
        
        eyes_open = (left_eye_vertical > 0.008 and right_eye_vertical > 0.008)
            
        return gaze, eyes_open
        
    except Exception as e:
        print(f"Gaze detection error: {e}")
        return "unknown", True

def detect_head_pose_fixed(face_landmarks, w, h):
    """FIXED head pose detection"""
    try:
        nose_tip = face_landmarks.landmark[1]
        left_eye = face_landmarks.landmark[33]
        right_eye = face_landmarks.landmark[263]
        
        eye_center_x = (left_eye.x + right_eye.x) / 2
        horizontal_diff = abs(nose_tip.x - eye_center_x)
        
        pose = "head forward"
        
        # Reasonable sensitivity
        if horizontal_diff > 0.1:
            # FIXED LOGIC: When head turns right, nose moves left relative to eyes
            if nose_tip.x < eye_center_x:
                pose = "head turned right"  # Fixed direction
            else:
                pose = "head turned left"   # Fixed direction
                
        return pose
    except Exception as e:
        print(f"Head pose error: {e}")
        return "unknown"

def detect_phone_usage_balanced(hands_results, face_center_x, face_center_y):
    """Balanced phone detection"""
    try:
        if not hands_results.multi_hand_landmarks:
            return False
            
        for hand_landmarks in hands_results.multi_hand_landmarks:
            wrist = hand_landmarks.landmark[0]
            
            # Reasonable distance check
            if (abs(wrist.x - face_center_x) < 0.25 and
                abs(wrist.y - face_center_y) < 0.25):
                return True
                
        return False
    except Exception as e:
        print(f"Phone detection error: {e}")
        return False

@app.route('/detect', methods=['POST'])
def detect():
    try:
        data = request.json
        if not data or 'image' not in data:
            return jsonify({"error": "No image data provided"}), 400
            
        img = decode_image(data['image'])
        if img is None:
            return jsonify({"error": "Invalid image"}), 400

        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        h, w, _ = img.shape

        # Initialize results
        results = {
            "faceDetected": False,
            "faceCount": 0,
            "gaze": "unknown",
            "eyesOpen": True,
            "headPose": "unknown",
            "phoneDetected": False,
            "multiplePeople": False,
            "suspiciousActivities": [],
            "faceBoundingBox": None,
            "eyeDetected": False,
            "gazeForward": True,
            "debugImage": None,
            "attentionScore": 100
        }

        # FACE DETECTION
        face_results = face_detector.process(rgb_img)
        
        if face_results.detections:
            results["faceCount"] = len(face_results.detections)
            results["faceDetected"] = True
            results["eyeDetected"] = True

            # Multiple faces detection
            if results["faceCount"] > 1:
                results["multiplePeople"] = True
                results["suspiciousActivities"].append("Multiple faces detected")

            # Process first face
            detection = face_results.detections[0]
            bbox = detection.location_data.relative_bounding_box
            
            x1 = int(bbox.xmin * w)
            y1 = int(bbox.ymin * h)
            x2 = x1 + int(bbox.width * w)
            y2 = y1 + int(bbox.height * h)
            
            face_center_x = (x1 + x2) / 2 / w
            face_center_y = (y1 + y2) / 2 / h
            
            results["faceBoundingBox"] = {
                "x1": x1, "y1": y1, "x2": x2, "y2": y2,
                "center_x": face_center_x,
                "center_y": face_center_y
            }
            
            cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)

            # FACE MESH for gaze and head pose - USING FIXED FUNCTIONS
            mesh_results = face_mesh.process(rgb_img)
            if mesh_results.multi_face_landmarks:
                landmarks = mesh_results.multi_face_landmarks[0]
                
                # FIXED gaze detection
                gaze_direction, eyes_open = get_gaze_direction_fixed(landmarks, w, h)
                results["gaze"] = gaze_direction
                results["eyesOpen"] = eyes_open
                results["gazeForward"] = (gaze_direction == "forward")
                
                # Reasonable criteria for suspicious activities
                if gaze_direction != "forward":
                    results["suspiciousActivities"].append(f"Gaze direction: {gaze_direction}")

                # FIXED head pose detection
                head_pose = detect_head_pose_fixed(landmarks, w, h)
                results["headPose"] = head_pose
                if head_pose != "head forward":
                    results["suspiciousActivities"].append(f"Head pose: {head_pose}")

            # HAND DETECTION for phone usage
            hand_results = hand_detector.process(rgb_img)
            phone_detected = detect_phone_usage_balanced(hand_results, face_center_x, face_center_y)
            results["phoneDetected"] = phone_detected
            if phone_detected:
                results["suspiciousActivities"].append("Potential phone usage detected")

        else:
            results["suspiciousActivities"].append("Face not visible")

        # Calculate reasonable attention score
        violation_count = len(results["suspiciousActivities"])
        results["attentionScore"] = max(0, 100 - (violation_count * 15))

        # Encode debug image
        try:
            # Add detection info to debug image
            status_text = f"Faces: {results['faceCount']} Gaze: {results['gaze']} Score: {results['attentionScore']}%"
            cv2.putText(img, status_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            
            if results["suspiciousActivities"]:
                for i, activity in enumerate(results["suspiciousActivities"][:3]):
                    cv2.putText(img, activity, (10, 60 + i*25), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)

            # Add mode indicator
            cv2.putText(img, "FIXED DIRECTION", (w - 200, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 165, 255), 2)

            _, buffer = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 70])
            debug_img = base64.b64encode(buffer).decode("utf-8")
            results["debugImage"] = f"data:image/jpeg;base64,{debug_img}"
        except Exception as e:
            print(f"Debug image error: {e}")

        return jsonify(results)

    except Exception as e:
        print(f"Detection error: {e}")
        return jsonify({"error": str(e), "message": "Internal server error occurred"}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

@app.route('/test', methods=['GET'])
def test_endpoint():
    return jsonify({"message": "Fixed Direction Proctoring Backend is working!", "status": "success"})

if __name__ == "__main__":
    print("FIXED DIRECTION Proctoring Server Running...")
    print("Features: FIXED gaze direction, head pose detection")
    print("Access the server at: http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=False)