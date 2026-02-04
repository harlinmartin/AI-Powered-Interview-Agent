import { useEffect, useRef, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Custom hook for Deepgram real-time speech recognition
 * @param {number} interviewId - Interview ID for WebSocket connection
 * @param {boolean} isListening - Whether to actively listen
 * @param {function} onTranscript - Callback when transcript is received
 * @param {function} onError - Callback when error occurs
 */
export const useDeepgramSpeech = (interviewId, isListening, onTranscript, onError) => {
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        if (!interviewId || !isListening) {
            // Stop listening
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            setIsConnected(false);
            return;
        }

        const startDeepgram = async () => {
            try {
                // Get microphone access
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        sampleRate: 16000,
                    }
                });
                streamRef.current = stream;

                // Create WebSocket connection to backend
                const wsUrl = API_URL.replace('http', 'ws') + `/speech/ws/audio/${interviewId}`;
                const ws = new WebSocket(wsUrl);
                wsRef.current = ws;

                ws.onopen = () => {
                    console.log('✅ Deepgram WebSocket connected');
                    setIsConnected(true);

                    // Start recording and streaming audio AFTER connection is open
                    const mediaRecorder = new MediaRecorder(stream, {
                        mimeType: 'audio/webm',
                    });
                    mediaRecorderRef.current = mediaRecorder;

                    mediaRecorder.ondataavailable = (event) => {
                        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
                            // Send audio chunk to backend only if connection is open
                            ws.send(event.data);
                        }
                    };

                    // Start recording with 250ms chunks
                    mediaRecorder.start(250);
                    console.log('🎤 Recording started');
                };

                ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    if (data.type === 'transcript' && data.content) {
                        console.log('📝 Deepgram transcript:', data.content);
                        onTranscript(data.content, data.is_final);
                    }
                };

                ws.onerror = (error) => {
                    console.error('❌ Deepgram WebSocket error:', error);
                    onError?.(error);
                };

                ws.onclose = () => {
                    console.log('🔌 Deepgram WebSocket closed');
                    setIsConnected(false);
                };

            } catch (error) {
                console.error('❌ Failed to start Deepgram:', error);
                onError?.(error);
            }
        };

        startDeepgram();

        // Cleanup
        return () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            if (wsRef.current) {
                wsRef.current.send(JSON.stringify({ type: 'stop' }));
                wsRef.current.close();
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [interviewId, isListening, onTranscript, onError]);

    return { isConnected };
};
