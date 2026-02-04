import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import 'regenerator-runtime/runtime'; // Polyfill for SpeechRecognition
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useTTS } from '../hooks/useTTS';
import { useAuthStore } from '../store/useAuthStore';
import {
    Mic, MicOff, PhoneOff, Video, VideoOff,
    Monitor, Captions, PlayCircle, Code, Sparkles
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
    const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition, isMicrophoneAvailable } = useSpeechRecognition();
    const { speak, cancel: cancelTTS, speaking: aiSpeaking } = useTTS();
    const [aiResponse, setAiResponse] = useState("Connected. Waiting for you to start...");
    const [lastQuestion, setLastQuestion] = useState(null); // NEW: Track last AI question for validation

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

    // Auto-end interview when timer hits 0
    useEffect(() => {
        if (remainingTime === 0 && started) {
            console.log('⏰ Timer reached 0 - Auto-ending interview');
            setTimeout(() => {
                handleEndInterview();
            }, 1000); // 1 second delay to show 00:00
        }
    }, [remainingTime, started]);

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
                    // Reverting to audio: false to prevent Linux device conflict with Web Speech API
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

            // HEARTBEAT: Keep connection alive every 10 seconds
            wsRef.current.pingInterval = setInterval(() => {
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({ type: "ping" }));
                }
            }, 10000);
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'ai_response') {
                setAiThinking(false); // Stop thinking animation
                setAiResponse(data.content);
                setLastQuestion(data.content); // Track the question for validation
                speak(data.content);
                setThinkTime(10);

                // Check if AI is concluding the interview
                const conclusionPhrases = [
                    'concludes our interview',
                    'that concludes the interview',
                    'thank you for your time',
                    'we are done',
                    'interview is complete',
                    'that wraps up'
                ];

                const isConclusion = conclusionPhrases.some(phrase =>
                    data.content.toLowerCase().includes(phrase)
                );

                if (isConclusion) {
                    console.log('🎯 AI concluded interview early');
                    // Wait 3 seconds for user to hear the conclusion, then auto-end
                    setTimeout(() => {
                        handleEndInterview();
                    }, 3000);
                }
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
            if (wsRef.current?.pingInterval) clearInterval(wsRef.current.pingInterval);
        };

        socket.onerror = (err) => {
            console.error("WS Error:", err);
            setWsStatus("Error");
        };

        wsRef.current = socket;
        return () => {
            if (wsRef.current?.pingInterval) clearInterval(wsRef.current.pingInterval);
            socket.close();
        };
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
                    // Force en-US and continuous
                    SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
                    console.log("Speech Logic: Restarting Listener...");
                } catch (e) {
                    console.error("Speech Logic: Start Failed", e);
                }
            }
        }
    }, [aiSpeaking, started, isMuted, listening]);

    // 8. Speech Recognition Error Handling
    useEffect(() => {
        if (!browserSupportsSpeechRecognition) return;

        const recognition = SpeechRecognition.getRecognition();
        if (!recognition) return;

        recognition.onerror = (event) => {
            console.error('🔴 Speech Recognition Error:', event.error, event.message);
            if (event.error === 'no-speech') {
                console.log('No speech detected - this is normal during silence');
            } else if (event.error === 'audio-capture') {
                console.error('CRITICAL: Microphone not accessible!');
            } else if (event.error === 'not-allowed') {
                console.error('CRITICAL: Microphone permission denied!');
            }
        };

        recognition.onend = () => {
            console.log('🔵 Speech Recognition Ended - Auto-restarting...');
            if (started && !aiSpeaking && !isMuted) {
                setTimeout(() => {
                    SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
                }, 100);
            }
        };

        return () => {
            if (recognition) {
                recognition.onerror = null;
                recognition.onend = null;
            }
        };
    }, [browserSupportsSpeechRecognition, started, aiSpeaking, isMuted]);

    // 9. Transcript Sender (Fixed)
    useEffect(() => {
        if (!transcript || transcript.trim().length < 3) return;
        if (aiSpeaking || !listening) return;

        const handler = setTimeout(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                console.log('📤 Sending transcript:', transcript);
                setAiThinking(true);
                wsRef.current.send(JSON.stringify({
                    type: 'user_audio_text',
                    content: transcript,
                    last_question: lastQuestion  // Send for validation
                }));
                resetTranscript();
            }
        }, 5000); // 5 seconds silence before submitting answer (allows thinking pauses)

        return () => clearTimeout(handler);
    }, [transcript, aiSpeaking, listening, resetTranscript]);

    // 10. Microphone Test Function
    const testMicrophone = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('✅ Microphone Test: SUCCESS', stream.getAudioTracks());
            const tracks = stream.getAudioTracks();
            alert(`Microphone is working!\nDevice: ${tracks[0]?.label || 'Unknown'}`);
            stream.getTracks().forEach(track => track.stop());
        } catch (err) {
            console.error('❌ Microphone Test: FAILED', err);
            alert(`Microphone Error: ${err.message}\n\nPlease check browser permissions.`);
        }
    };

    // ================= RENDER =================

    console.log("RENDER DEBUG:", { started, browserSupportsSpeechRecognition, listening, transcript });

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
        <div className="flex flex-col md:flex-row h-screen bg-theme-bg text-slate-900 p-6 gap-6 overflow-hidden relative">

            {/* LEFT: AI & Info */}
            {/* LEFT: AI & Info */}
            <div className={`${showCodeEditor ? 'w-full md:w-1/5' : 'w-full md:w-1/3'} flex flex-col gap-6 transition-all duration-300 flex`}>
                <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 flex-1 flex flex-col justify-center items-center relative shadow-xl overflow-hidden">

                    {/* Background Gradients */}
                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl transition-all duration-700 ${aiSpeaking ? 'bg-blue-500/20 scale-150' : ''}`}></div>
                    </div>

                    {/* AI CORE VISUALIZATION */}
                    <div className="relative z-10 flex flex-col items-center justify-center flex-1">

                        {/* The Orb */}
                        <div className={`relative flex items-center justify-center transition-all duration-500 ${showCodeEditor ? 'w-32 h-32' : 'w-64 h-64'}`}>
                            {/* Outer Glow Ring */}
                            <div className={`absolute inset-0 rounded-full border-2 transition-all duration-500 ${aiSpeaking ? 'border-blue-400/30 scale-110 animate-pulse' :
                                aiThinking ? 'border-purple-400/30 scale-100 animate-spin-slow' :
                                    listening ? 'border-red-400/30 scale-105' :
                                        'border-cyan-400/10 scale-100'
                                }`}></div>

                            {/* Inner Core */}
                            <div className={`w-full h-full rounded-full shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] flex items-center justify-center relative overflow-hidden transition-all duration-500 ${aiSpeaking ? 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-[0_0_60px_rgba(59,130,246,0.6)] animate-pulse-fast' :
                                aiThinking ? 'bg-gradient-to-br from-purple-600 to-fuchsia-600 shadow-[0_0_40px_rgba(147,51,234,0.5)] animate-pulse' :
                                    listening ? 'bg-gradient-to-br from-rose-600 to-red-600 shadow-[0_0_40px_rgba(225,29,72,0.5)]' :
                                        'bg-gradient-to-br from-slate-700 to-slate-800 shadow-[0_0_30px_rgba(148,163,184,0.1)]'
                                }`}>
                                <span className="absolute top-2 text-[8px] text-white/20 font-mono">v2.1 LIVE</span>
                                {/* Core Highlight */}
                                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent"></div>

                                {/* Status Icon Overlay */}
                                <div className={`text-white transition-all duration-300 ${aiSpeaking || aiThinking ? 'opacity-80 scale-110' : 'opacity-40 scale-100'}`}>
                                    {aiSpeaking ? <Sparkles size={showCodeEditor ? 32 : 64} className="animate-spin-slow" /> :
                                        aiThinking ? <Sparkles size={showCodeEditor ? 32 : 64} className="animate-bounce" /> :
                                            listening ? <div className="w-4 h-4 rounded-full bg-white animate-ping" /> :
                                                <div className="w-20 h-1 bg-white/20 rounded-full" />
                                    }
                                </div>
                            </div>
                        </div>

                        {/* Status Text & Indicators */}
                        <div className="text-center mt-12 space-y-4">
                            <h3 className="text-2xl font-bold text-white tracking-tight">AI Interviewer</h3>

                            <div className="h-8 flex justify-center items-center">
                                {aiThinking && (
                                    <span className="flex items-center gap-2 text-purple-300 font-medium animate-pulse bg-purple-500/10 px-4 py-1.5 rounded-full border border-purple-500/20 text-sm">
                                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                                        Processing Result...
                                    </span>
                                )}
                                {listening && !aiThinking && (
                                    <span className="flex items-center gap-2 text-rose-400 font-medium animate-pulse bg-rose-500/10 px-4 py-1.5 rounded-full border border-rose-500/20 text-sm">
                                        <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></div>
                                        Listening to you...
                                    </span>
                                )}
                                {!listening && !aiThinking && !aiSpeaking && (
                                    <span className="text-slate-500 text-sm font-medium">Ready</span>
                                )}
                                {aiSpeaking && (
                                    <span className="text-blue-300 text-sm font-medium animate-pulse">Speaking...</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Captions / Subtitles Area */}
                    <div className="w-full mt-6 min-h-[5rem] flex flex-col items-center justify-end relative z-10">
                        {showCaptions && aiResponse && (
                            <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-white/10 w-full">
                                <p className="text-white/90 text-sm text-center font-medium leading-relaxed">"{aiResponse}"</p>
                            </div>
                        )}
                        {!aiSpeaking && (
                            <div className="flex justify-center mt-2 items-center gap-2">
                                <button onClick={() => speak(aiResponse)} className="text-xs text-slate-500 hover:text-white transition-colors flex items-center gap-1">
                                    <PlayCircle size={12} /> Replay
                                </button>
                                {transcript && (
                                    <span className="ml-3 text-xs text-slate-700 truncate max-w-[150px]">Last heard: "{transcript}"</span>
                                )}
                                {/* Manual Mic Reset for debugging - ALWAYS VISIBLE */}
                                <button
                                    onClick={() => SpeechRecognition.startListening({ continuous: true, language: 'en-US' })}
                                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 border border-red-500/20 px-2 py-1 rounded"
                                >
                                    <MicOff size={10} /> Reset Mic
                                </button>
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
                <div className="flex-[2] rounded-[2.5rem] flex flex-col overflow-hidden animate-fade-in-up shadow-soft z-10 h-full bg-white border border-white/60">
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
            <div className="flex-1 bg-black rounded-[2.5rem] overflow-hidden relative border border-white/60 flex flex-col shadow-soft min-h-0">
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
                    {showCaptions && (
                        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 w-4/5 text-center px-4 z-50">
                            <div className={`transition-all duration-300 ${listening ? 'opacity-100' : 'opacity-50'}`}>
                                <span className="bg-black/80 text-blue-300 px-3 py-1 rounded-t-lg text-[10px] font-bold uppercase tracking-widest border-t border-x border-white/10">
                                    {listening ? "Live Transcription" : "Mic Paused"}
                                </span>
                                <div className="bg-black/80 px-4 py-3 rounded-xl rounded-t-none backdrop-blur-md border border-white/10 text-lg font-medium text-white shadow-xl min-h-[3rem] flex items-center justify-center">
                                    {transcript ? transcript : <span className="text-gray-500 italic text-sm">Listening for speech...</span>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* BOTTOM CONTROLS BAR */}
                <div className="h-auto md:h-24 py-4 md:py-0 bg-gray-900 border-t border-gray-800 flex flex-wrap md:flex-nowrap items-center justify-center gap-4 px-6 flex-shrink-0 z-50">

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
