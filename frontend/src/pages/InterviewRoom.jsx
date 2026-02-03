import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import 'regenerator-runtime/runtime'; // Polyfill for SpeechRecognition
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useTTS } from '../hooks/useTTS';
import { useAuthStore } from '../store/useAuthStore';
import {
    Mic, MicOff, PhoneOff, Video, VideoOff,
    Monitor, Captions, PlayCircle, Code
} from 'lucide-react';
import { ProfessionalWorkspace } from '../components/ProfessionalWorkspace';

export const InterviewRoom = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const wsRef = useRef(null); // Changed to Ref

    const [wsStatus, setWsStatus] = useState("Disconnected"); // Added WS Status
    const [mediaError, setMediaError] = useState(null); // Added Media Error

    // UX State
    const [started, setStarted] = useState(false);
    const [showCaptions, setShowCaptions] = useState(false);
    const [isVideoEnabled, setIsVideoEnabled] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [showCodeEditor, setShowCodeEditor] = useState(false);


    // Professional Workspace State
    const [activeCodeTab, setActiveCodeTab] = useState('q1');
    const [questions, setQuestions] = useState({
        q1: { id: 'q1', title: 'Question 1', code: '// Waiting for Question 1...', language: 'javascript', desc: 'No question loaded yet.' },
        q2: { id: 'q2', title: 'Question 2', code: '// Waiting for Question 2...', language: 'python', desc: 'No question loaded yet.' }
    });

    // Voice Hooks
    const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();
    const { speak, cancel: cancelTTS, speaking: aiSpeaking } = useTTS();
    const [aiResponse, setAiResponse] = useState("Connected. Waiting for you to start...");

    // Timers
    const [remainingTime, setRemainingTime] = useState(600);
    const [thinkTime, setThinkTime] = useState(0);
    const [aiThinking, setAiThinking] = useState(false); // Added missing state

    const token = useAuthStore(state => state.token);

    // ================= EFFECT HOOKS =================

    // 1. Cleanup TTS
    useEffect(() => {
        return () => cancelTTS();
    }, [cancelTTS]);

    // 2. Global Timer (Countdown)
    useEffect(() => {
        if (!started || remainingTime <= 0) return;
        const interval = setInterval(() => setRemainingTime(t => Math.max(0, t - 1)), 1000);
        return () => clearInterval(interval);
    }, [started, remainingTime]);

    // 3. Think Time
    useEffect(() => {
        let interval;
        if (!aiSpeaking && thinkTime > 0) {
            interval = setInterval(() => setThinkTime(t => t - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [aiSpeaking, thinkTime]);

    // 4. Media Setup (Camera or Screen)
    useEffect(() => {
        if (!started) return;

        const startMedia = async () => {
            setMediaError(null);
            try {
                let stream;
                if (isScreenSharing) {
                    stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
                    stream.getVideoTracks()[0].onended = () => {
                        setIsScreenSharing(false);
                    };
                } else {
                    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                }

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Media Error:", err);
                setMediaError("Could not access Camera/Microphone. Please allow permissions.");
                if (isScreenSharing) setIsScreenSharing(false);
            }
        };

        startMedia();
    }, [started, isScreenSharing]);

    // 5. Toggle Video Track (Mute Video)
    useEffect(() => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject;
            if (!isScreenSharing) {
                stream.getVideoTracks().forEach(track => track.enabled = isVideoEnabled);
            }
        }
    }, [isVideoEnabled, isScreenSharing]);

    // 6. WebSocket Setup
    useEffect(() => {
        if (!token || !id || !started) return;

        console.log("Attempting WebSocket Connection...");
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setWsStatus("Connecting...");
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const WS_URL = API_URL.replace(/^http/, 'ws');
        const socket = new WebSocket(`${WS_URL}/interview/ws/${id}?token=${token}`);

        socket.onopen = () => {
            console.log("WS Connected");
            setWsStatus("Connected");
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'ai_response') {
                setAiResponse(data.content);
                speak(data.content);
                setThinkTime(10);
            }

            if (data.type === 'coding_assessment') {
                console.log("Starting Coding Assessment");
                setShowCodeEditor(true);

                setQuestions(prev => {
                    let newQuestions = { ...prev };

                    if (typeof data.questions === 'string') {
                        const fullText = data.questions;
                        let q1Text = "", q2Text = "";

                        // Robust Clean Split
                        if (fullText.includes("// Question 2:")) {
                            const parts = fullText.split("// Question 2:");
                            q1Text = parts[0].trim();
                            q2Text = "// Question 2:\n" + parts[1].trim();
                        } else if (fullText.includes("# Question 2:")) {
                            const parts = fullText.split("# Question 2:");
                            q1Text = parts[0].trim();
                            q2Text = "# Question 2:\n" + parts[1].trim();
                        } else {
                            // Fallback: Duplicate text to Q1 if no split found
                            q1Text = fullText;
                            q2Text = "// No specific Question 2 found.";
                        }

                        newQuestions.q1 = {
                            ...newQuestions.q1,
                            desc: q1Text,
                            code: q1Text + "\n\n// Write your solution below:\n"
                        };

                        newQuestions.q2 = {
                            ...newQuestions.q2,
                            desc: q2Text,
                            code: q2Text + "\n\n// Write your solution below:\n"
                        };

                    } else if (data.questions && typeof data.questions === 'object') {
                        return { ...prev, ...data.questions };
                    }
                    return newQuestions;
                });
            }
        };

        socket.onclose = () => {
            console.log("WS Disconnected");
            setWsStatus("Disconnected");
        };

        socket.onerror = (err) => {
            console.error("WS Error:", err);
            setWsStatus("Error");
        };

        wsRef.current = socket;
        return () => socket.close();
    }, [id, token, speak, navigate, started]);

    // 7. Speech Logic
    useEffect(() => {
        if (!started) return;

        console.log(`Speech Logic: AI Speaking: ${aiSpeaking}, Muted: ${isMuted}`);

        if (aiSpeaking) {
            SpeechRecognition.stopListening();
        } else {
            if (!isMuted && !listening) {
                try {
                    SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
                    console.log("Speech Logic: Started Listening");
                } catch (e) {
                    console.error("Speech Logic: Start Failed", e);
                }
            } else if (isMuted) {
                SpeechRecognition.stopListening();
            }
        }
    }, [aiSpeaking, started, isMuted, listening]);

    // 8. Transcript Sender
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (transcript) setThinkTime(prev => prev === 0 ? prev : 0);

        const handler = setTimeout(() => {
            if (transcript && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                setAiThinking(true); // START THINKING
                wsRef.current.send(JSON.stringify({ type: 'user_audio_text', content: transcript }));
                resetTranscript();
            }
        }, 1200); // Reduced debounce to 1.2s for faster response

        return () => clearTimeout(handler);
    }, [transcript, resetTranscript]);


    // ================= RENDER =================

    console.log("RENDER DEBUG:", { started, browserSupportsSpeechRecognition });

    if (!browserSupportsSpeechRecognition) return <div className="p-10 text-white">Browser doesn't support speech recognition. Use Chrome.</div>;

    // OVERLAY: Start Interview
    if (!started) {
        return (
            <div className="flex bg-gray-900 h-screen items-center justify-center p-4">
                <div className="bg-gray-800 p-10 rounded-2xl text-center shadow-2xl border border-gray-700 max-w-lg w-full relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-blue-500"></div>
                    <div className="mb-6 bg-blue-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-blue-400">
                        <Mic size={40} />
                    </div>
                    <h1 className="text-3xl font-bold mb-3 text-white">Ready to Start?</h1>
                    <p className="text-gray-400 mb-8 leading-relaxed">
                        The AI Interviewer is ready. Check your camera and microphone.
                    </p>
                    <button
                        onClick={() => {
                            setStarted(true);
                            if (window.speechSynthesis) {
                                window.speechSynthesis.resume();
                                window.speechSynthesis.speak(new SpeechSynthesisUtterance(" "));
                            }
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-blue-500/20 transition-all transform hover:scale-[1.02]"
                    >
                        Start Interview
                    </button>
                    <p className="mt-4 text-xs text-gray-500">Allow Camera & Screen Share permissions when prompted.</p>
                </div>
            </div>
        );
    }

    const handleEndInterview = async () => {
        // Call finalize API
        if (token && id) {
            try {
                const formData = new FormData();
                formData.append('duration_seconds', (600 - remainingTime).toString());
                // Send Code
                if (showCodeEditor) {
                    // Send all answers
                    const finalCode = JSON.stringify(questions);
                    formData.append('code_content', finalCode);
                }

                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                await fetch(`${API_URL}/interview/${id}/finalize`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
            } catch (e) {
                console.error("Failed to save duration", e);
            }
        }
        navigate('/feedback/' + id);
    };

    return (
        <div className="flex flex-col md:flex-row h-screen bg-gray-950 text-white p-4 gap-4 overflow-hidden relative">

            {/* LEFT: AI & Info */}
            <div className={`${showCodeEditor ? 'w-1/5' : 'w-1/3'} flex flex-col gap-4 transition-all duration-300 hidden md:flex`}>
                <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 flex-1 flex flex-col justify-center items-center relative shadow-inner">
                    {/* Think Buffer */}
                    {aiThinking && (
                        <div className="absolute top-4 left-4 right-4 bg-blue-950/50 rounded-lg p-2 text-center border border-blue-900/50 animate-pulse">
                            <span className="text-xs font-bold text-blue-300">AI is thinking...</span>
                        </div>
                    )}

                    <div className={`rounded-full flex items-center justify-center transition-all duration-500 ${aiSpeaking ? 'bg-blue-600 scale-105 shadow-[0_0_50px_blue]' : aiThinking ? 'bg-purple-600 animate-bounce' : 'bg-gray-800'} ${showCodeEditor ? 'w-24 h-24 text-2xl' : 'w-56 h-56 text-7xl'}`}>
                        {aiSpeaking ? '🔊' : aiThinking ? '💭' : '🤖'}
                    </div>

                    <div className="text-center w-full mt-6">
                        <h3 className="text-xl font-bold text-white">AI Interviewer</h3>

                        {/* LISTENING INDICATOR */}
                        <div className="flex justify-center items-center gap-2 mt-2 h-6">
                            {listening ? (
                                <>
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                    </span>
                                    <span className="text-xs text-red-400 font-mono animate-pulse">LISTENING...</span>
                                </>
                            ) : (
                                <span className="text-xs text-gray-500 font-mono">Mic Inactive</span>
                            )}
                        </div>

                        <div className="min-h-[4rem] flex flex-col items-center justify-center">
                            {showCaptions && (
                                <p className="text-gray-300 text-sm italic px-2 mt-2 h-20 overflow-y-auto custom-scrollbar">"{aiResponse}"</p>
                            )}
                        </div>
                        {!aiSpeaking && (
                            <div className="flex flex-col gap-2">
                                <button onClick={() => speak(aiResponse)} className="mt-2 text-xs text-blue-400 hover:underline flex items-center gap-1 mx-auto">
                                    <PlayCircle size={12} /> Replay Audio
                                </button>
                                {transcript && (
                                    <span className="text-xs text-green-400 font-mono animate-pulse">Hearing: "{transcript}"</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Timer */}
                <div className="bg-gray-900 p-4 rounded-2xl border border-gray-800 flex justify-between items-center px-8">
                    <span className={`text-2xl font-mono font-bold ${remainingTime < 60 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                        {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, '0')}
                    </span>
                    <span className="text-xs text-gray-500 font-bold tracking-widest">REMAINING</span>
                </div>
            </div>

            {/* MIDDLE: Code Editor (Conditional) */}
            {showCodeEditor && (
                <div className="flex-[2] rounded-2xl flex flex-col overflow-hidden animate-fade-in-up shadow-2xl z-10 h-full">
                    <ProfessionalWorkspace
                        items={questions}
                        activeTab={activeCodeTab}
                        onStateChange={(newItems, newActiveTab) => {
                            setQuestions(newItems);
                            if (newActiveTab) setActiveCodeTab(newActiveTab);
                        }}
                        onSubmit={handleEndInterview}
                    />
                </div>
            )}

            {/* RIGHT: User Video & Controls */}
            <div className="flex-1 bg-black rounded-2xl overflow-hidden relative border border-gray-800 flex flex-col shadow-2xl min-h-0">
                <div className="relative flex-1 bg-gray-900 min-h-0">
                    <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${!isScreenSharing ? 'transform scale-x-[-1]' : ''}`} />

                    {/* Media Error Overlay */}
                    {mediaError && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 z-20 p-6 text-center">
                            <div>
                                <div className="text-red-500 text-5xl mb-4">📷</div>
                                <h3 className="text-xl font-bold text-white mb-2">Camera Access Denied</h3>
                                <p className="text-gray-400">{mediaError}</p>
                                <button onClick={() => window.location.reload()} className="mt-4 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-white">Retry</button>
                            </div>
                        </div>
                    )}

                    {/* WS Status Overlay (Debug) */}
                    <div className="absolute top-4 right-4 z-20">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${wsStatus === 'Connected' ? 'bg-green-500/20 text-green-400' :
                            wsStatus === 'Connecting...' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                            {wsStatus}
                        </span>
                    </div>

                    {/* Captions Overlay */}
                    {showCaptions && transcript && (
                        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 w-4/5 text-center px-4">
                            <span className="bg-black/80 text-blue-300 px-3 py-1 rounded-t-lg text-[10px] font-bold uppercase tracking-widest border-t border-x border-white/10">Scanning Audio</span>
                            <div className="bg-black/80 px-4 py-3 rounded-xl rounded-t-none backdrop-blur-md border border-white/10 text-lg font-medium text-white shadow-xl">
                                {transcript}
                            </div>
                        </div>
                    )}
                </div>

                {/* BOTTOM CONTROLS BAR */}
                <div className="h-24 bg-gray-900 border-t border-gray-800 flex items-center justify-center gap-4 px-6 flex-shrink-0 z-50">

                    {/* Mic Toggle */}
                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className={`p-4 rounded-full transition-all hover:scale-110 ${isMuted ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                        title={isMuted ? "Unmute" : "Mute"}
                    >
                        {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                    </button>

                    {/* Video Toggle */}
                    <button
                        onClick={() => setIsVideoEnabled(!isVideoEnabled)}
                        className={`p-4 rounded-full transition-all hover:scale-110 ${!isVideoEnabled ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                        title={!isVideoEnabled ? "Turn On Camera" : "Turn Off Camera"}
                    >
                        {!isVideoEnabled ? <VideoOff size={22} /> : <Video size={22} />}
                    </button>

                    <div className="w-px h-8 bg-gray-700 mx-2 hidden sm:block"></div>

                    {/* Code Editor Toggle */}
                    <button
                        onClick={() => setShowCodeEditor(!showCodeEditor)}
                        className={`p-4 rounded-full transition-all hover:scale-110 ${showCodeEditor ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                        title="Toggle Code Editor"
                    >
                        <Code size={22} />
                    </button>

                    {/* Screen Share Toggle */}
                    <button
                        onClick={() => setIsScreenSharing(!isScreenSharing)}
                        className={`p-4 rounded-full transition-all hover:scale-110 ${isScreenSharing ? 'bg-green-600 text-white shadow-lg shadow-green-500/40' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                        title="Share Screen"
                    >
                        <Monitor size={22} />
                    </button>

                    {/* Captions Toggle */}
                    <button
                        onClick={() => setShowCaptions(!showCaptions)}
                        className={`p-4 rounded-full transition-all hover:scale-110 ${showCaptions ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                        title="Captions"
                    >
                        <Captions size={22} />
                    </button>

                    <div className="flex-1"></div>

                    {/* End Call */}
                    <button
                        onClick={handleEndInterview}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:shadow-red-600/30 transition flex items-center gap-2"
                    >
                        <PhoneOff size={20} /> <span className="hidden sm:inline">End Interview</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
