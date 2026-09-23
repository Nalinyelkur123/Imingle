"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Header } from "@/components/Header";
import { useInterests } from "@/hooks/useInterests";
import {
  ChatState,
  ReportReason,
  SocketEvents,
  MatchInfo,
  MessageReceivedPayload,
  WebRTCOfferPayload,
  WebRTCAnswerPayload,
  ICECandidatePayload,
  MatchEndedPayload,
  submitReportApi,
} from "@/services/api";
import { connectSocket } from "@/services/socket";

interface Message {
  id: string;
  sender: "you" | "stranger" | "system";
  text: string;
  time: string;
}

interface ChatRoomProps {
  initialMode?: "video" | "text";
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

let msgCounter = 0;
function createUniqueId(prefix = "msg"): string {
  msgCounter += 1;
  return `${prefix}-${Date.now()}-${msgCounter}-${Math.random().toString(36).substring(2, 7)}`;
}

export function ChatRoom({ initialMode = "video" }: ChatRoomProps) {
  const [mode] = useState<"video" | "text">(initialMode);
  const [chatState, setChatState] = useState<ChatState>(ChatState.IDLE);
  const [stopConfirm, setStopConfirm] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [sharedInterest, setSharedInterest] = useState<string | null>(null);
  const [currentMatch, setCurrentMatch] = useState<MatchInfo | null>(null);
  const [remoteStreamActive, setRemoteStreamActive] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState<ReportReason>(
    ReportReason.OTHER
  );
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [matchDuration, setMatchDuration] = useState(0);

  const [interests] = useInterests();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // Clean up WebRTC peer connection
  const cleanupPeerConnection = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    setRemoteStreamActive(false);
  }, []);

  // Request camera and microphone if mode is video
  useEffect(() => {
    if (mode !== "video") return;

    let isMounted = true;
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      })
      .catch(() => {
        // Fallback gracefully if camera is not granted or supported
      });

    return () => {
      isMounted = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      cleanupPeerConnection();
    };
  }, [mode, cleanupPeerConnection]);

  // Setup WebRTC peer connection when matched in video mode
  const setupPeerConnection = useCallback(
    async (isInitiator: boolean) => {
      if (mode !== "video") return;
      cleanupPeerConnection();

      const socket = connectSocket();
      const pc = new RTCPeerConnection(RTC_CONFIG);
      peerConnectionRef.current = pc;

      // Add local tracks if available
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      // Handle incoming remote tracks
      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setRemoteStreamActive(true);
        }
      };

      // Handle local ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit(SocketEvents.ICE_CANDIDATE, {
            candidate: event.candidate.candidate,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sdpMid: event.candidate.sdpMid,
          } as ICECandidatePayload);
        }
      };

      // If initiator, create and send offer
      if (isInitiator) {
        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await pc.setLocalDescription(offer);
          socket.emit(SocketEvents.WEBRTC_OFFER, {
            sdp: offer.sdp || "",
          } as WebRTCOfferPayload);
        } catch {
          // Peer connection error handled gracefully
        }
      }
    },
    [mode, cleanupPeerConnection]
  );

  // Start chat - join matchmaking queue
  const startChat = useCallback(() => {
    cleanupPeerConnection();
    setCurrentMatch(null);
    setSharedInterest(null);
    setChatState(ChatState.SEARCHING);
    setStopConfirm(false);
    setMatchDuration(0);

    const socket = connectSocket();

    setMessages([
      {
        id: createUniqueId("sys"),
        sender: "system",
        text:
          interests.length > 0
            ? `Searching for strangers who like: ${interests.join(", ")}...`
            : "Looking for someone to chat with...",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);

    socket.emit(SocketEvents.JOIN_QUEUE, {
      mode,
      interests,
    });
  }, [mode, interests, cleanupPeerConnection]);

  // Next stranger
  const handleNext = useCallback(() => {
    cleanupPeerConnection();
    const socket = connectSocket();
    socket.emit(SocketEvents.NEXT);
    setStopConfirm(false);
    setSharedInterest(null);
    setCurrentMatch(null);
    startChat();
  }, [cleanupPeerConnection, startChat]);

  // Stop chat
  const handleStop = useCallback(() => {
    if (!stopConfirm && chatState === ChatState.CONNECTED) {
      setStopConfirm(true);
      return;
    }
    setStopConfirm(false);
    cleanupPeerConnection();
    const socket = connectSocket();
    socket.emit(SocketEvents.STOP);
    setCurrentMatch(null);
    setChatState(ChatState.IDLE);
    setMatchDuration(0);
  }, [stopConfirm, chatState, cleanupPeerConnection]);

  // Handle Socket.IO events
  useEffect(() => {
    const socket = connectSocket();

    // MATCH_FOUND
    const handleMatchFound = (payload: {
      matchId: string;
      partnerId: string;
      isInitiator: boolean;
      sharedInterest: string | null;
    }) => {
      const matchInfo: MatchInfo = {
        matchId: payload.matchId,
        partnerId: payload.partnerId,
        isInitiator: payload.isInitiator,
      };

      setCurrentMatch(matchInfo);
      setSharedInterest(payload.sharedInterest);
      setChatState(ChatState.CONNECTED);
      setMatchDuration(0);

      const sysText = payload.sharedInterest
        ? `You both like: #${payload.sharedInterest}! Say hi to the stranger.`
        : "You're now chatting with a random stranger. Say hi!";

      setMessages((prev) => [
        ...prev,
        {
          id: createUniqueId("sys"),
          sender: "system",
          text: sysText,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);

      if (mode === "video") {
        setupPeerConnection(payload.isInitiator);
      }
    };

    // MESSAGE_RECEIVED
    const handleMessageReceived = (payload: MessageReceivedPayload) => {
      setMessages((prev) => [
        ...prev,
        {
          id: payload.id || createUniqueId("stranger"),
          sender: "stranger",
          text: payload.content,
          time: new Date(payload.timestamp || Date.now()).toLocaleTimeString(
            [],
            { hour: "2-digit", minute: "2-digit" }
          ),
        },
      ]);
    };

    // WEBRTC_OFFER
    const handleWebRTCOffer = async (payload: WebRTCOfferPayload) => {
      if (mode !== "video" || !peerConnectionRef.current) return;
      try {
        const pc = peerConnectionRef.current;
        await pc.setRemoteDescription(
          new RTCSessionDescription({ type: "offer", sdp: payload.sdp })
        );
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit(SocketEvents.WEBRTC_ANSWER, {
          sdp: answer.sdp || "",
        } as WebRTCAnswerPayload);
      } catch {
        // Handled gracefully
      }
    };

    // WEBRTC_ANSWER
    const handleWebRTCAnswer = async (payload: WebRTCAnswerPayload) => {
      if (mode !== "video" || !peerConnectionRef.current) return;
      try {
        const pc = peerConnectionRef.current;
        await pc.setRemoteDescription(
          new RTCSessionDescription({ type: "answer", sdp: payload.sdp })
        );
      } catch {
        // Handled gracefully
      }
    };

    // ICE_CANDIDATE
    const handleICECandidate = async (payload: ICECandidatePayload) => {
      if (mode !== "video" || !peerConnectionRef.current) return;
      try {
        const candidate = new RTCIceCandidate({
          candidate: payload.candidate,
          sdpMLineIndex: payload.sdpMLineIndex,
          sdpMid: payload.sdpMid,
        });
        await peerConnectionRef.current.addIceCandidate(candidate);
      } catch {
        // Handled gracefully
      }
    };

    // MATCH_ENDED / PARTNER_DISCONNECTED
    const handleMatchEnded = (payload?: MatchEndedPayload) => {
      cleanupPeerConnection();
      setCurrentMatch(null);
      setChatState(ChatState.ENDED);
      const reasonMsg =
        payload?.reason === "reported"
          ? "Stranger has been reported."
          : "Stranger has disconnected.";

      setMessages((prev) => [
        ...prev,
        {
          id: createUniqueId("sys"),
          sender: "system",
          text: reasonMsg,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    };

    socket.on(SocketEvents.MATCH_FOUND, handleMatchFound);
    socket.on(SocketEvents.MESSAGE_RECEIVED, handleMessageReceived);
    socket.on(SocketEvents.WEBRTC_OFFER, handleWebRTCOffer);
    socket.on(SocketEvents.WEBRTC_ANSWER, handleWebRTCAnswer);
    socket.on(SocketEvents.ICE_CANDIDATE, handleICECandidate);
    socket.on(SocketEvents.MATCH_ENDED, handleMatchEnded);
    socket.on(SocketEvents.PARTNER_DISCONNECTED, handleMatchEnded);

    return () => {
      socket.off(SocketEvents.MATCH_FOUND, handleMatchFound);
      socket.off(SocketEvents.MESSAGE_RECEIVED, handleMessageReceived);
      socket.off(SocketEvents.WEBRTC_OFFER, handleWebRTCOffer);
      socket.off(SocketEvents.WEBRTC_ANSWER, handleWebRTCAnswer);
      socket.off(SocketEvents.ICE_CANDIDATE, handleICECandidate);
      socket.off(SocketEvents.MATCH_ENDED, handleMatchEnded);
      socket.off(SocketEvents.PARTNER_DISCONNECTED, handleMatchEnded);
    };
  }, [mode, cleanupPeerConnection, setupPeerConnection]);

  // Keyboard shortcut: ESC skips/stops/starts
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (chatState === ChatState.CONNECTED) {
          handleNext();
        } else if (chatState === ChatState.IDLE || chatState === ChatState.ENDED) {
          startChat();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [chatState, handleNext, startChat]);

  // Match duration counter
  useEffect(() => {
    if (chatState !== ChatState.CONNECTED) return;
    const timer = setInterval(() => {
      setMatchDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [chatState]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message
  const sendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = inputMessage.trim();
    if (!text || chatState !== ChatState.CONNECTED) return;

    const socket = connectSocket();
    const newMsg: Message = {
      id: createUniqueId("msg"),
      sender: "you",
      text,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputMessage("");

    socket.emit(SocketEvents.SEND_MESSAGE, { content: text });
  };

  // Submit report
  const submitReport = async () => {
    setReportSubmitted(true);
    const socket = connectSocket();

    // 1. Emit real-time report over socket
    socket.emit(SocketEvents.REPORT_USER, {
      reason: selectedReportReason,
    });

    // 2. Persist to REST API
    await submitReportApi({
      reason: selectedReportReason,
      matchId: currentMatch?.matchId,
      reportedUserId: currentMatch?.partnerId,
    });

    setTimeout(() => {
      setShowReportModal(false);
      setReportSubmitted(false);
      handleNext();
    }, 1000);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="flex h-screen h-dvh w-full flex-col overflow-hidden bg-[#f8f8fb] dark:bg-[#0e0d14]">
      {/* Header */}
      <Header />

      {/* Main Layout - Fits 100% within available viewport height without overflow */}
      <div className="flex flex-1 min-h-0 min-w-0 w-full flex-col md:flex-row gap-2.5 sm:gap-3.5 lg:gap-4 px-2.5 sm:px-4 lg:px-6 pb-2.5 sm:pb-3.5 overflow-hidden">
        {/* Left Column: Two Stacked Video Feeds on desktop, 2-column grid on mobile */}
        {mode === "video" && (
          <div className="w-full grid grid-cols-2 gap-2 h-[140px] sm:h-[180px] shrink-0 md:flex md:flex-col md:h-full md:w-[320px] lg:w-[380px] xl:w-[440px] 2xl:w-[480px] md:max-w-[44vw] md:gap-2.5 lg:gap-3 overflow-hidden">
            {/* 1. Remote Stranger Video Box */}
            <div className="relative h-full w-full min-h-0 md:flex-1 overflow-hidden rounded-xl sm:rounded-2xl bg-[#36363c] flex items-center justify-center shadow-xs">
              {/* Real Remote Video Track Feed */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`h-full w-full object-cover ${
                  remoteStreamActive && chatState === ChatState.CONNECTED
                    ? "block"
                    : "hidden"
                }`}
              />

              {/* Display states when remote video stream is inactive */}
              {(!remoteStreamActive || chatState !== ChatState.CONNECTED) && (
                <>
                  {chatState === ChatState.IDLE && (
                    <div className="flex flex-col items-center justify-center gap-1.5 text-gray-400">
                      <svg
                        width="36"
                        height="36"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="opacity-40 sm:w-11 sm:h-11"
                      >
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                  )}

                  {chatState === ChatState.SEARCHING && (
                    <div className="flex flex-col items-center gap-2 text-white">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 animate-spin rounded-full border-2 sm:border-3 border-white/20 border-t-white" />
                      <span className="text-[11px] sm:text-xs font-medium text-gray-300">
                        Looking for someone...
                      </span>
                    </div>
                  )}

                  {chatState === ChatState.CONNECTED && (
                    <div className="relative flex h-full w-full flex-col items-center justify-center text-white">
                      <div className="flex h-14 w-14 sm:h-18 sm:w-18 items-center justify-center rounded-full bg-gradient-to-tr from-[#673ddc] to-indigo-500 shadow-lg">
                        <svg
                          width="28"
                          height="28"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="sm:w-9 sm:h-9"
                        >
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </div>
                      <div className="mt-2 sm:mt-2.5 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-0.5 text-[11px] sm:text-xs">
                        <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-green-500 animate-pulse" />
                        <span>Stranger ({formatTimer(matchDuration)})</span>
                      </div>
                      {sharedInterest && (
                        <span className="mt-1 rounded-full bg-[#673ddc]/90 px-2 py-0.5 text-[10px] sm:text-[11px] font-semibold text-white">
                          #{sharedInterest}
                        </span>
                      )}
                    </div>
                  )}

                  {chatState === ChatState.ENDED && (
                    <div className="flex flex-col items-center gap-1 text-gray-400 p-2 text-center">
                      <span className="text-xs sm:text-sm font-semibold text-gray-300">
                        Chat ended
                      </span>
                      <span className="text-[10px] sm:text-xs text-gray-400">
                        Click &apos;Next&apos; (Esc) to start
                      </span>
                    </div>
                  )}
                </>
              )}

              {/* Bottom-left watermark matching Screenshot 3: "💬 umingle.com" */}
              <div className="absolute bottom-2 left-2.5 sm:bottom-3 sm:left-3.5 flex items-center gap-1.5 opacity-90 select-none">
                <div className="flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-xs bg-[#673ddc]">
                  <svg
                    width="9"
                    height="9"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                    className="sm:w-2.5 sm:h-2.5"
                  >
                    <path d="M20 11.5C20 15.6421 16.4183 19 12 19C10.6387 19 9.35517 18.6833 8.22557 18.1251L4 19.5L5.37488 15.7744C4.50294 14.5262 4 13.0762 4 11.5C4 7.35786 7.58172 4 12 4C16.4183 4 20 7.35786 20 11.5Z" />
                  </svg>
                </div>
                <span className="text-[11px] sm:text-xs font-bold text-white tracking-wide">
                  umingle
                  <span className="text-[10px] sm:text-[11px] font-normal text-gray-300">
                    .com
                  </span>
                </span>
              </div>

              {/* Bottom-right flag icon matching Screenshot 3 */}
              <button
                onClick={() => setShowReportModal(true)}
                className="absolute bottom-2 right-2.5 sm:bottom-3 sm:right-3.5 text-gray-300 hover:text-white transition-colors cursor-pointer"
                title="Report user"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="sm:w-[18px] sm:h-[18px]"
                >
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" y1="22" x2="4" y2="15" />
                </svg>
              </button>
            </div>

            {/* 2. Local Self Video Box directly below matching Screenshot 3 */}
            <div className="relative h-full w-full min-h-0 md:flex-1 overflow-hidden rounded-xl sm:rounded-2xl bg-black shadow-xs flex items-center justify-center">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover -scale-x-100"
              />
            </div>
          </div>
        )}

        {/* Right Column: Main Rules / Chat Box + Bottom Bar matching Screenshot 3 */}
        <div className="flex flex-1 min-w-0 min-h-0 flex-col gap-2 sm:gap-2.5 md:gap-3 h-full overflow-hidden">
          {/* Main White Content Box matching Screenshot 3 */}
          <div className="relative flex-1 min-h-0 overflow-y-auto rounded-xl sm:rounded-2xl border border-gray-200/80 bg-white p-4 sm:p-6 lg:p-7 shadow-xs dark:border-gray-800 dark:bg-[#161520]">
            {chatState === ChatState.IDLE ? (
              /* Welcome to Umingle message matching Screenshot 3 */
              <div className="flex flex-col gap-3 sm:gap-4 text-left select-none">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-[#18181b] dark:text-white">
                  Welcome to Umingle.
                </h2>

                <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-[#673ddc] dark:text-[#a78bfa]">
                  <span className="rounded bg-[#ef4444] px-1.5 py-0.5 text-[11px] sm:text-xs font-extrabold text-white">
                    18+
                  </span>
                  <span>You must be 18 or older</span>
                </div>

                <div className="space-y-1 sm:space-y-1.5 text-sm sm:text-base font-medium text-[#18181b] dark:text-gray-200">
                  <p>No nudity, hate speech, or harassment</p>
                  <p>Your camera must show you, live</p>
                  <p>Do not ask for gender — this is not a dating site</p>
                  <p className="font-extrabold text-[#18181b] dark:text-white">
                    Violators will be banned
                  </p>
                </div>
              </div>
            ) : (
              /* Messages Stream when matching/connected/ended */
              <div className="flex flex-col space-y-2.5 sm:space-y-3">
                {messages.map((msg, index) => {
                  const messageKey = `${msg.id || "msg"}-${index}`;
                  if (msg.sender === "system") {
                    return (
                      <div key={messageKey} className="my-1 text-center">
                        <span className="inline-block rounded-lg bg-gray-100 px-3 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          {msg.text}
                        </span>
                      </div>
                    );
                  }

                  const isYou = msg.sender === "you";
                  return (
                    <div
                      key={messageKey}
                      className={`flex flex-col ${
                        isYou ? "items-end" : "items-start"
                      }`}
                    >
                      <div className="text-[11px] text-gray-400 mb-0.5 px-1">
                        {isYou ? "You" : "Stranger"}
                      </div>
                      <div
                        className={`max-w-[85%] sm:max-w-[80%] rounded-xl px-3.5 py-2 text-sm leading-relaxed shadow-xs ${
                          isYou
                            ? "bg-[#673ddc] text-white rounded-br-xs"
                            : "bg-gray-100 text-[#18181b] dark:bg-gray-800 dark:text-gray-100 rounded-bl-xs"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Options Row matching Screenshot 3: Smart Match and Get Premium */}
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 sm:px-3.5 py-1 sm:py-1.5 text-xs font-semibold text-gray-700 shadow-xs transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-[#1e1d2c] dark:text-gray-200 cursor-pointer"
            >
              <span>🌍</span>
              <span>Smart Match</span>
              <span className="text-[10px] text-gray-400">▾</span>
            </button>

            <button
              type="button"
              className="flex items-center gap-1 rounded-full bg-[#673ddc] px-3.5 sm:px-4 py-1 sm:py-1.5 text-xs font-bold text-white shadow-xs transition-transform hover:brightness-105 cursor-pointer"
            >
              <span>⚡</span>
              <span>Get Premium</span>
            </button>
          </div>

          {/* Bottom Action Row matching Screenshot 3: Big Purple Button + Input Field */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
            {/* Start / Stop / Next Button matching Screenshot 3 */}
            {chatState === ChatState.IDLE ? (
              <button
                onClick={startChat}
                className="flex h-[48px] sm:h-[52px] md:h-[56px] w-[75px] sm:w-[90px] shrink-0 flex-col items-center justify-center rounded-xl bg-[#673ddc] text-white shadow-md transition-all hover:bg-[#5b34c9] active:scale-95 cursor-pointer"
                id="chat-start-btn"
              >
                <span className="text-sm sm:text-base font-bold leading-tight">Start</span>
                <span className="text-[10px] sm:text-[11px] opacity-80 leading-none">Esc</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={handleStop}
                  className={`flex h-[48px] sm:h-[52px] md:h-[56px] w-[70px] sm:w-[85px] shrink-0 flex-col items-center justify-center rounded-xl text-white shadow-md transition-all active:scale-95 cursor-pointer ${
                    stopConfirm
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-gray-800 hover:bg-gray-900"
                  }`}
                  id="chat-stop-btn"
                >
                  <span className="text-xs sm:text-sm font-bold leading-tight">
                    {stopConfirm ? "Really?" : "Stop"}
                  </span>
                  <span className="text-[10px] sm:text-[11px] opacity-80 leading-none">Esc</span>
                </button>

                <button
                  onClick={handleNext}
                  className="flex h-[48px] sm:h-[52px] md:h-[56px] w-[70px] sm:w-[85px] shrink-0 flex-col items-center justify-center rounded-xl bg-[#673ddc] text-white shadow-md transition-all hover:bg-[#5b34c9] active:scale-95 cursor-pointer"
                  id="chat-next-btn"
                >
                  <span className="text-sm sm:text-base font-bold leading-tight">Next</span>
                  <span className="text-[10px] sm:text-[11px] opacity-80 leading-none">Esc</span>
                </button>
              </div>
            )}

            {/* Chat Input Box matching Screenshot 3 */}
            <form onSubmit={sendMessage} className="relative flex-1 min-w-0">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder=""
                disabled={chatState !== ChatState.CONNECTED}
                className="h-[48px] sm:h-[52px] md:h-[56px] w-full rounded-xl border border-gray-200 bg-white pl-3.5 sm:pl-4 pr-11 sm:pr-12 text-sm text-gray-800 placeholder-gray-400 shadow-xs outline-none transition-colors focus:border-[#673ddc] focus:ring-1 focus:ring-[#673ddc] disabled:bg-gray-50 dark:border-gray-700 dark:bg-[#161520] dark:text-gray-100"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || chatState !== ChatState.CONNECTED}
                className="absolute right-3 sm:right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#673ddc] transition-colors disabled:opacity-30 cursor-pointer"
                title="Send Message"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="sm:w-[22px] sm:h-[22px]"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-[#161520]">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Report User
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Help keep Umingle safe. Select why you are reporting this user:
            </p>

            <div className="mt-4 space-y-2">
              {[
                {
                  reason: ReportReason.HARASSMENT,
                  label: "Harassment or Bullying",
                },
                {
                  reason: ReportReason.SEXUAL_CONTENT,
                  label: "Inappropriate / Nudity",
                },
                {
                  reason: ReportReason.SPAM,
                  label: "Spam or Advertising",
                },
                {
                  reason: ReportReason.THREATENING,
                  label: "Threats or Violence",
                },
                {
                  reason: ReportReason.OTHER,
                  label: "Other Rule Violation",
                },
              ].map((item) => (
                <label
                  key={item.reason}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 text-sm text-gray-800 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={item.reason}
                    checked={selectedReportReason === item.reason}
                    onChange={() => setSelectedReportReason(item.reason)}
                    className="accent-[#673ddc]"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReport}
                disabled={reportSubmitted}
                className="rounded-xl bg-red-600 px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-red-700 cursor-pointer disabled:opacity-50"
              >
                {reportSubmitted ? "Reported! Skipping..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
