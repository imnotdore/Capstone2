import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import { FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash, FaUser, FaComment } from "react-icons/fa";

export default function ExamRoom({ roomId }) {
  const location = useLocation();
  const { 
    teacherName = "Teacher", 
    teacherId, 
    classSubject = "Subject",
    studentName = "Student",
    studentId 
  } = location.state || {};

  // Determine if current user is teacher or student
  const isTeacher = !!teacherId;
  const currentUserName = isTeacher ? teacherName : studentName;
  const currentUserId = isTeacher ? teacherId : studentId;

  const localVideoRef = useRef();
  const [peerStreams, setPeerStreams] = useState({});
  const [peerInfo, setPeerInfo] = useState({});
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [timer, setTimer] = useState(0);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const examDuration = 30 * 60;
  const socketRef = useRef();
  const localStreamRef = useRef();
  const peersRef = useRef({});
  const makingOfferRef = useRef(false);
  const isInitializedRef = useRef(false);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => setTimer(prev => (prev < examDuration ? prev + 1 : prev)), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Cleanup function
  const cleanup = () => {
    console.log("🧹 Cleaning up connections...");
    
    // Close all peer connections
    Object.values(peersRef.current).forEach(pc => {
      if (pc && typeof pc.close === 'function') {
        pc.close();
      }
    });
    peersRef.current = {};
    
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      localStreamRef.current = null;
    }
    
    // Clear peer streams and info
    setPeerStreams({});
    setPeerInfo({});
    
    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    isInitializedRef.current = false;
  };

  // Function to update peer media status
  const updatePeerMediaStatus = (peerId, cameraEnabled, microphoneEnabled) => {
    console.log(`🔄 Updating media status for ${peerId}: Camera ${cameraEnabled ? 'ON' : 'OFF'}, Mic ${microphoneEnabled ? 'ON' : 'OFF'}`);
    
    setPeerInfo(prev => ({
      ...prev,
      [peerId]: {
        ...prev[peerId],
        camOn: cameraEnabled,
        micOn: microphoneEnabled
      }
    }));

    // If camera is turned off, clear the video stream
    if (!cameraEnabled) {
      setPeerStreams(prev => ({
        ...prev,
        [peerId]: null
      }));
    }
  };

  // Function to broadcast local media status
  const broadcastMediaStatus = () => {
    if (socketRef.current) {
      console.log(`📢 Broadcasting media status: Camera ${camOn ? 'ON' : 'OFF'}, Mic ${micOn ? 'ON' : 'OFF'}`);
      socketRef.current.emit("media-status", {
        roomId,
        camOn,
        micOn
      });
    }
  };

  // Socket & WebRTC - IMPROVED VERSION
  useEffect(() => {
    // Prevent multiple initializations
    if (isInitializedRef.current) {
      return;
    }
    isInitializedRef.current = true;

    console.log("🚀 Initializing Exam Room...");
    socketRef.current = io("http://localhost:3000");

    const initMediaStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Join room with user info
        socketRef.current.emit("join-room", { 
          roomId, 
          name: currentUserName, 
          id: currentUserId,
          isTeacher: isTeacher 
        });
        console.log(`✅ ${currentUserName} joined room ${roomId}`);

        // Broadcast initial media status after a short delay
        setTimeout(() => {
          broadcastMediaStatus();
        }, 1000);

      } catch (error) {
        console.error("Error accessing media devices:", error);
        alert("Camera and microphone access is required for the exam.");
      }
    };

    initMediaStream();

    // Socket event handlers
    socketRef.current.on("room-participants", (participants) => {
      console.log("👥 Room participants:", participants);
      
      participants.forEach(participant => {
        if (participant.id === socketRef.current.id) {
          return; // Skip self
        }
        
        // Check if connection already exists
        if (!peersRef.current[participant.id]) {
          console.log(`🔗 Creating connection to ${participant.name}`);
          createPeerConnection(participant);
        } else {
          console.log(`⚠️ Connection to ${participant.name} already exists`);
        }
      });
    });

    socketRef.current.on("user-joined", (user) => {
      console.log("🟢 User joined:", user);
      if (user.id !== socketRef.current.id && !peersRef.current[user.id]) {
        console.log(`🔗 Creating connection to new user ${user.name}`);
        createPeerConnection(user);
        
        // Send our current media status to the new user
        setTimeout(() => {
          broadcastMediaStatus();
        }, 500);
      }
    });

    socketRef.current.on("offer", async ({ from, sdp, name, isTeacher: offerIsTeacher }) => {
      console.log(`📨 Received offer from ${name}`);
      
      // Check if we already have a connection to this user
      if (peersRef.current[from]) {
        console.log(`⚠️ Already have connection to ${name}, ignoring duplicate offer`);
        return;
      }
      
      const pc = createPeerConnection({ id: from, name, isTeacher: offerIsTeacher });
      
      try {
        makingOfferRef.current = true;
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        socketRef.current.emit("answer", { 
          target: from, 
          sdp: pc.localDescription,
          name: currentUserName,
          isTeacher: isTeacher
        });
        console.log(`📤 Sent answer to ${name}`);
      } catch (error) {
        console.error("Error handling offer:", error);
      } finally {
        makingOfferRef.current = false;
      }
    });

    socketRef.current.on("answer", async ({ from, sdp, name, isTeacher: answerIsTeacher }) => {
      console.log(`📨 Received answer from ${name}`);
      const pc = peersRef.current[from];
      
      if (!pc) {
        console.log(`❌ No peer connection found for ${name}`);
        return;
      }
      
      if (pc.signalingState !== "stable") {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          console.log(`✅ Set remote description for ${name}`);
        } catch (error) {
          console.error("Error setting remote description:", error);
        }
      } else {
        console.log(`⚠️ Peer connection to ${name} is already stable`);
      }
    });

    socketRef.current.on("ice-candidate", async ({ from, candidate }) => {
      const pc = peersRef.current[from];
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error("Error adding ICE candidate:", error);
        }
      }
    });

    socketRef.current.on("user-left", (userId) => {
      console.log("🔴 User left:", userId);
      removePeerConnection(userId);
    });

    // Handle media status updates from other users - IMPROVED
    socketRef.current.on("media-status-update", ({ userId, camOn: remoteCamOn, micOn: remoteMicOn, name, isTeacher }) => {
      console.log(`📹 Media status update from ${name || userId}: Camera ${remoteCamOn ? 'ON' : 'OFF'}, Mic ${remoteMicOn ? 'ON' : 'OFF'}`);
      
      // Update peer info with media status
      updatePeerMediaStatus(userId, remoteCamOn, remoteMicOn);
    });

    // Handle socket disconnect
    socketRef.current.on("disconnect", () => {
      console.log("🔌 Socket disconnected");
    });

    // Chat messages
    socketRef.current.on("receive-message", ({ name, message, isTeacher: senderIsTeacher }) => {
      setMessages(prev => [...prev, { 
        id: Date.now(), 
        text: message, 
        sender: name,
        isTeacher: senderIsTeacher 
      }]);
    });

    // Cleanup on component unmount
    return () => {
      console.log("🛑 Component unmounting, cleaning up...");
      cleanup();
    };
  }, [roomId, currentUserName, currentUserId, isTeacher]);

  // Function to remove peer connection
  const removePeerConnection = (peerId) => {
    if (peersRef.current[peerId]) {
      console.log(`🗑️ Removing connection to ${peerId}`);
      peersRef.current[peerId].close();
      delete peersRef.current[peerId];
    }
    
    setPeerStreams(prev => {
      const updated = { ...prev };
      delete updated[peerId];
      return updated;
    });
    
    setPeerInfo(prev => {
      const updated = { ...prev };
      delete updated[peerId];
      return updated;
    });
  };

  const createPeerConnection = (peerData) => {
    // Check if peer connection already exists
    if (peersRef.current[peerData.id]) {
      console.log(`⚠️ Connection to ${peerData.name} already exists, returning existing`);
      return peersRef.current[peerData.id];
    }

    console.log(`🔗 Creating new peer connection to ${peerData.name}`);
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log(`🎬 Received track from ${peerData.name}`);
      
      // Check current camera status before setting stream
      const shouldShowStream = peerInfo[peerData.id]?.camOn !== false;
      
      setPeerStreams(prev => ({
        ...prev,
        [peerData.id]: shouldShowStream ? event.streams[0] : null
      }));
    };

    // ICE candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("ice-candidate", {
          target: peerData.id,
          candidate: event.candidate
        });
      }
    };

    // Connection state monitoring
    pc.onconnectionstatechange = () => {
      console.log(`🔗 Connection state with ${peerData.name}: ${pc.connectionState}`);
      
      if (pc.connectionState === 'connected') {
        console.log(`✅ Successfully connected to ${peerData.name}`);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        console.log(`❌ Connection to ${peerData.name} failed, removing...`);
        removePeerConnection(peerData.id);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`🧊 ICE connection state with ${peerData.name}: ${pc.iceConnectionState}`);
    };

    // Store peer connection
    peersRef.current[peerData.id] = pc;

    // Store peer info with default media status
    setPeerInfo(prev => ({
      ...prev,
      [peerData.id]: {
        name: peerData.name,
        isOwner: isTeacher && peerData.id === teacherId,
        isTeacher: peerData.isTeacher,
        camOn: true, // Default to on until we receive status update
        micOn: true  // Default to on until we receive status update
      }
    }));

    // Create offer immediately for new connections
    if (localStreamRef.current) {
      console.log(`📤 Creating offer for ${peerData.name}`);
      createOffer(pc, peerData);
    } else {
      console.log(`⏳ Waiting for local stream before creating offer to ${peerData.name}`);
    }

    return pc;
  };

  const createOffer = async (pc, peerData) => {
    try {
      makingOfferRef.current = true;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      socketRef.current.emit("offer", {
        target: peerData.id,
        sdp: pc.localDescription,
        name: currentUserName,
        isTeacher: isTeacher
      });
      console.log(`📤 Sent offer to ${peerData.name}`);
    } catch (error) {
      console.error("Error creating offer:", error);
    } finally {
      makingOfferRef.current = false;
    }
  };

  const toggleCam = () => {
    if (!localStreamRef.current) return;
    
    const videoTracks = localStreamRef.current.getVideoTracks();
    if (videoTracks.length > 0) {
      const newCamState = !camOn;
      videoTracks[0].enabled = newCamState;
      setCamOn(newCamState);
      
      console.log(`📹 Local camera ${newCamState ? 'ENABLED' : 'DISABLED'}`);
      
      // Update local video display immediately
      if (localVideoRef.current) {
        if (newCamState) {
          localVideoRef.current.srcObject = localStreamRef.current;
        } else {
          localVideoRef.current.srcObject = null;
        }
      }
      
      // Broadcast the camera status change
      broadcastMediaStatus();
    }
  };

  const toggleMic = () => {
    if (!localStreamRef.current) return;
    
    const audioTracks = localStreamRef.current.getAudioTracks();
    if (audioTracks.length > 0) {
      const newMicState = !micOn;
      audioTracks[0].enabled = newMicState;
      setMicOn(newMicState);
      
      console.log(`🎤 Local microphone ${newMicState ? 'ENABLED' : 'DISABLED'}`);
      
      // Broadcast the microphone status change
      broadcastMediaStatus();
    }
  };

  const sendMessage = () => {
    if (!messageInput.trim()) return;
    
    // Send message via socket
    socketRef.current.emit("send-message", { 
      roomId, 
      message: messageInput,
      name: currentUserName,
      isTeacher: isTeacher
    });
    
    setMessageInput("");
  };

  const VideoFrame = ({ stream, name, isOwner, isTeacher, camOn: peerCamOn, micOn: peerMicOn, peerId }) => (
    <div style={{
      position: "relative",
      flexBasis: "calc(10% - 50px)",
      height: "200px",
      border: isOwner ? "2px solid #4caf50" : (isTeacher ? "2px solid #2196f3" : "1px solid #666"),
      borderRadius: "8px",
      overflow: "hidden",
      backgroundColor: "#333",
      minWidth: "300px"
    }}>
      <video
        autoPlay
        playsInline
        ref={el => { 
          if (el) {
            if (stream && peerCamOn) {
              el.srcObject = stream;
            } else {
              el.srcObject = null;
            }
          }
        }}
        style={{ 
          width: "100%", 
          height: "100%", 
          objectFit: "cover",
          transform: "scaleX(-1)", // Mirror effect
          display: (stream && peerCamOn) ? "block" : "none"
        }}
      />
      {(!stream || !peerCamOn) && (
        <div style={{
          position: "absolute",
          top: 0, left: 0, width: "100%", height: "100%",
          display: "flex", justifyContent: "center", alignItems: "center",
          fontSize: "60px", color: "#fff", backgroundColor: "#555"
        }}>
          <FaUser />
        </div>
      )}
      <div style={{
        position: "absolute",
        bottom: "10px",
        left: "10px",
        color: "#fff",
        fontWeight: "bold",
        textShadow: "0 0 5px black",
        backgroundColor: "rgba(0,0,0,0.5)",
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "14px"
      }}>
        {name} {isOwner ? "(Owner)" : (isTeacher ? "(Teacher)" : "(Student)")}
      </div>
      
      {/* Peer Media Status Indicators */}
      <div style={{
        position: "absolute",
        bottom: "10px",
        right: "10px",
        display: "flex",
        gap: "10px",
        backgroundColor: "rgba(0,0,0,0.5)",
        padding: "5px 10px",
        borderRadius: "20px"
      }}>
        <div style={{ 
          color: peerCamOn ? "green" : "red", 
          fontSize: "16px",
          display: "flex",
          alignItems: "center"
        }}>
          {peerCamOn ? <FaVideo /> : <FaVideoSlash />}
        </div>
        <div style={{ 
          color: peerMicOn ? "green" : "red", 
          fontSize: "16px",
          display: "flex",
          alignItems: "center"
        }}>
          {peerMicOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      background: `linear-gradient(
        90deg,
        #7E7E7E 0%,
        #FFFFFF 8%,
        #887575 71%,
        #BF3F3F 100%,
        #FF0000 100%
      )`
    }}>
      {/* Top Bar */}
      <div style={{
        padding: "10px",
        borderBottom: "1px solid gray",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "rgba(255, 255, 255, 0.2)"
      }}>
        <h2 style={{ color: "#fff7f7ff", textShadow: "1px 1px 3px rgba(0, 0, 0, 1)" }}>
          {classSubject} - {isTeacher ? "Teacher View" : "Student View"}
        </h2>
        <div style={{ fontWeight: "bold", color: "#fff" }}>
          Timer: {formatTime(examDuration - timer)}
        </div>
      </div>

      {/* Video Grid */}
      <div style={{ 
        flex: 1, 
        display: "flex", 
        flexWrap: "wrap", 
        padding: "20px", 
        gap: "10px",
        justifyContent: "center",
        alignItems: "center"
      }}>
        {/* Local Video */}
        <div style={{ 
          position: "relative", 
          flexBasis: "calc(50% - 200px)", 
          height: "350px", 
          border: isTeacher ? "2px solid #4caf50" : "2px solid #2196f3", 
          borderRadius: "8px", 
          overflow: "hidden",
          minWidth: "400px"
        }}>
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            style={{ 
              width: "100%", 
              height: "100%", 
              objectFit: "cover",
              transform: "scaleX(-1)", // Mirror effect
              display: camOn ? "block" : "none"
            }}
          />
          {!camOn && (
            <div style={{
              position: "absolute",
              top: 0, left: 0, width: "100%", height: "100%",
              display: "flex", justifyContent: "center", alignItems: "center",
              fontSize: "60px", color: "#fff", backgroundColor: "#999"
            }}>
              <FaUser />
            </div>
          )}
          <div style={{
            position: "absolute",
            bottom: "10px",
            left: "10px",
            color: "#fff",
            fontWeight: "bold",
            textShadow: "0 0 5px black",
            backgroundColor: "rgba(0,0,0,0.5)",
            padding: "2px 8px",
            borderRadius: "4px"
          }}>
            {currentUserName} {isTeacher ? "(Teacher)" : "(Student)"}
          </div>
          <div style={{
            position: "absolute",
            bottom: "10px",
            right: "10px",
            display: "flex",
            gap: "10px",
            backgroundColor: "rgba(0,0,0,0.5)",
            padding: "5px 10px",
            borderRadius: "20px"
          }}>
            <button 
              onClick={toggleCam} 
              style={{ 
                color: camOn ? "green" : "red", 
                border: "none", 
                background: "transparent", 
                cursor: "pointer",
                fontSize: "16px"
              }}
            >
              {camOn ? <FaVideo /> : <FaVideoSlash />}
            </button>
            <button 
              onClick={toggleMic} 
              style={{ 
                color: micOn ? "green" : "red", 
                border: "none", 
                background: "transparent", 
                cursor: "pointer",
                fontSize: "16px"
              }}
            >
              {micOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
            </button>
          </div>
        </div>

        {/* Peer Videos */}
        {Object.entries(peerStreams).map(([id, stream]) => {
          const info = peerInfo[id] || {};
          return (
            <VideoFrame 
              key={id} 
              stream={stream} 
              name={info.name || "User"} 
              isOwner={info.isOwner} 
              isTeacher={info.isTeacher} 
              camOn={info.camOn !== false} // Default to true if undefined
              micOn={info.micOn !== false} // Default to true if undefined
              peerId={id}
            />
          );
        })}
      </div>

      {/* Chat Section */}
      <div
        style={{
          position: "absolute",
          bottom: "100px",
          right: "20px",
          width: "50px",
          height: "50px",
          borderRadius: "50%",
          backgroundColor: "#4caf50",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          cursor: "pointer",
          zIndex: 1000,
        }}
        onClick={() => setMessagesOpen(!messagesOpen)}
      >
        <FaComment color="white" size={24} />
      </div>

      {messagesOpen && (
        <aside
          style={{
            position: "absolute",
            bottom: "80px",
            right: "20px",
            width: "300px",
            height: "400px",
            backgroundColor: "white",
            border: "1px solid #ccc",
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            zIndex: 1000,
            boxShadow: "0 4px 10px rgba(0,0,0,0.3)"
          }}
        >
          <div style={{  
            color: "#8f8a8aff",
            padding: "10px",
            borderBottom: "1px solid #ccc",
            fontWeight: "bold",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            Exam Chat
            <button
              onClick={() => setMessagesOpen(false)}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ 
            color: "#000000ab",
            flex: 1,
            padding: "10px",
            overflowY: "auto",
            fontSize: "14px"
          }}>
            {messages.length === 0 ? (
              <div style={{ color: "#888" }}>No messages yet</div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} style={{ 
                  marginBottom: "8px",
                  padding: "5px",
                  backgroundColor: msg.isTeacher ? "#e3f2fd" : "#f5f5f5",
                  borderRadius: "5px"
                }}>
                  <strong>{msg.sender}:</strong> {msg.text}
                </div>
              ))
            )}
          </div>

          <div style={{ color: "#888", display: "flex", borderTop: "1px solid #ccc" }}>
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Type your message..."
              style={{
                flex: 1,
                padding: "8px",
                border: "none",
                outline: "none",
                borderRadius: "0 0 0 8px"
              }}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              style={{
                padding: "0 15px",
                border: "none",
                backgroundColor: "#4caf50",
                color: "white",
                cursor: "pointer",
                borderRadius: "0 0 8px 0"
              }}
            >
              Send
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}