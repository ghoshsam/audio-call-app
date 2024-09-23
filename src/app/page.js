"use client";
import { useEffect, useState, useRef } from "react";
import SimplePeer from "simple-peer";

export default function Home() {
  const [stream, setStream] = useState(null);
  const [peer, setPeer] = useState(null);
  const [connected, setConnected] = useState(false);
  const socket = useRef(null);
  const userVideo = useRef(null);
  const messageQueue = useRef([]);

  useEffect(() => {
    // Get access to the user's microphone
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        console.log("Stream  received from microphone:", stream);
        setStream(stream);
      })
      .catch((error) => {
        console.error("Error accessing microphone:", error);
      });

    // Connect to WebSocket server
    socket.current = new WebSocket(
      "wss://eager-blinny-aec-demo-project-4fb931d1.koyeb.app/ws/1"
    );

    socket.current.onopen = () => {
      console.log("WebSocket connection established");
      setConnected(true);
      // Send any queued messages
      while (messageQueue.current.length > 0) {
        const message = messageQueue.current.shift();
        socket.current.send(message);
      }
    };

    socket.current.onmessage = (message) => {
      console.log("Message received:", message.data);
      const data = JSON.parse(message.data);
      if (data.signal) {
        console.log("Signal received:", JSON.stringify(data.signal));
        if (peer) {
          peer.signal(data.signal);
        } else {
          console.error("Peer is not initialized");
        }
      }
    };

    socket.current.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.current.onclose = () => {
      console.log("WebSocket connection closed");
      setConnected(false);
    };
  }, [peer]);

  const sendMessage = (message) => {
    if (socket.current.readyState === WebSocket.OPEN) {
      socket.current.send(message);
    } else {
      messageQueue.current.push(message);
    }
  };

  const initiateCall = () => {
    if (!stream) {
      console.error("Stream is not available");
      return;
    }

    const newPeer = new SimplePeer({
      initiator: true,
      trickle: false,
      stream: stream,
    });

    newPeer.on("signal", (signal) => {
      console.log("Sending signal:", JSON.stringify({ signal }));
      sendMessage(JSON.stringify({ signal }));
    });

    newPeer.on("stream", (remoteStream) => {
      console.log("Stream received from call:", remoteStream);
      if (userVideo.current) {
        userVideo.current.srcObject = remoteStream;
        userVideo.current.play().catch((error) => {
          console.error("Error playing audio:", error);
        });
      }
    });

    newPeer.on("error", (error) => {
      console.error("Peer error:", error);
    });

    setPeer(newPeer);
  };

  const answerCall = () => {
    if (!stream) {
      console.error("Stream is not available");
      return;
    }

    const newPeer = new SimplePeer({
      initiator: false,
      trickle: false,
      stream: stream,
    });

    newPeer.on("signal", (signal) => {
      console.log("Sending signal:", JSON.stringify({ signal }));
      sendMessage(JSON.stringify({ signal }));
    });

    newPeer.on("stream", (remoteStream) => {
      console.log("Stream received from answer:", remoteStream);
      if (userVideo.current) {
        console.log("Setting remote stream to audio element");
        userVideo.current.srcObject = remoteStream;

        userVideo.current.play().catch((error) => {
          console.error("Error playing audio:", error);
        });
      }
    });

    newPeer.on("error", (error) => {
      console.error("Peer error:", error);
    });

    setPeer(newPeer);
  };

  return (
    <div>
      <h1>Audio Calling App</h1>
      <button onClick={initiateCall}>Call</button>
      <button onClick={answerCall}>Answer</button>

      <audio ref={userVideo} autoPlay></audio>
    </div>
  );
}
