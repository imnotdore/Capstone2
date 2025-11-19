from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64
import mediapipe as mp

app = Flask(__name__)
CORS(app)

# MediaPipe Init
mp_face_detection = mp.solutions.face_detection
mp_face_mesh = mp.solutions.face_mesh

face_detector = mp_face_detection.FaceDetection(
    model_selection=0,
    min_detection_confidence=0.55
)

face_mesh = mp_face_mesh.FaceMesh(
    max_num_faces=3,
    refine_landmarks=True,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

def decode_image(image_base64):
    """Decode base64 → OpenCV image"""
    image_data = image_base64.split(',')[1] if "," in image_base64 else image_base64
    img_bytes = base64.b64decode(image_data)
    img_np = np.frombuffer(img_bytes, np.uint8)
    return cv2.imdecode(img_np, cv2.IMREAD_COLOR)

def get_gaze_direction(face_landmarks, w, h):
    """Determine if looking left/right/up/down"""

    left_eye = face_landmarks.landmark[33]
    right_eye = face_landmarks.landmark[263]

    eye_center_x = ((left_eye.x + right_eye.x) / 2) * w
    eye_center_y = ((left_eye.y + right_eye.y) / 2) * h

    gaze = "forward"

    # Horizontal gaze
    if eye_center_x < w * 0.35:
        gaze = "looking left"
    elif eye_center_x > w * 0.65:
        gaze = "looking right"

    # Vertical gaze
    elif eye_center_y < h * 0.35:
        gaze = "looking up"
    elif eye_center_y > h * 0.65:
        gaze = "looking down"

    return gaze

@app.route('/detect', methods=['POST'])
def detect():
    try:
        data = request.json
        img = decode_image(data['image'])
        if img is None:
            return jsonify({"error": "Invalid image"}), 400

        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        h, w, _ = img.shape

        # FACE DETECTION
        results = face_detector.process(rgb_img)
        face_count = 0
        face_detected = False
        suspicious = []
        gaze_direction = "unknown"

        if results.detections:
            face_count = len(results.detections)
            face_detected = True

            # Suspicious if more than 1 face
            if face_count > 1:
                suspicious.append("Multiple faces detected")

            # Draw first face only
            detection = results.detections[0]
            bbox = detection.location_data.relative_bounding_box

            x1 = int(bbox.xmin * w)
            y1 = int(bbox.ymin * h)
            x2 = x1 + int(bbox.width * w)
            y2 = y1 + int(bbox.height * h)
            cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)

            # GAZE ESTIMATION
            mesh_results = face_mesh.process(rgb_img)
            if mesh_results.multi_face_landmarks:
                lm = mesh_results.multi_face_landmarks[0]

                gaze_direction = get_gaze_direction(lm, w, h)

                if gaze_direction != "forward":
                    suspicious.append(f"Gaze direction: {gaze_direction}")

        else:
            suspicious.append("Face not visible")

        # Encode debug image
        _, buffer = cv2.imencode(".jpg", img)
        debug_img = base64.b64encode(buffer).decode("utf-8")

        return jsonify({
            "faceDetected": face_detected,
            "faceCount": face_count,
            "gaze": gaze_direction,
            "suspiciousActivities": suspicious,
            "debugImage": f"data:image/jpeg;base64,{debug_img}"
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    print("Proctoring Server Running (Faces + Gaze + Multi-face)...")
    app.run(host="0.0.0.0", port=5000, debug=True)
