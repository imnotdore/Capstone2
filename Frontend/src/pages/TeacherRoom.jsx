// TeacherExamRoom.jsx
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export default function TeacherExamRoom({ roomId, teacherName }) {
  const localVideoRef = useRef();
  const [peers, setPeers] = useState({});
  const socketRef = useRef();

  useEffect(() => {
    socketRef.current = io("http://localhost:5000"); // your server URL
    const socket = socketRef.current;

    // Join the room as teacher
    socket.emit("join-room", { roomId, userName: teacherName, isTeacher: true });

    // Get local media
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        localVideoRef.current.srcObject = stream;
        socket.emit("teacher-stream", { roomId }); // optional for signaling peers

        // Listen for new students
        socket.on("student-joined", ({ studentId }) => {
          // setup peer connection with student
        });
      });

    return () => socket.disconnect();
  }, [roomId, teacherName]);

  return (
    <div>
      <video ref={localVideoRef} autoPlay muted />
      {/* You can add student videos here */}
    </div>
  );
}
