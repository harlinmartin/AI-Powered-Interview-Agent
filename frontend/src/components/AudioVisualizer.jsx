import React, { useRef, useEffect } from 'react';

export const AudioVisualizer = ({ stream, isAiSpeaking }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const sourceRef = useRef(null);

    useEffect(() => {
        if (!stream || isAiSpeaking) return;

        // Initialize Audio Context
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }

        const audioCtx = audioContextRef.current;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        try {
            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);
            sourceRef.current = source;
        } catch (e) {
            console.error("Audio Visualizer Error:", e);
            return;
        }

        const canvas = canvasRef.current;
        const canvasCtx = canvas.getContext('2d');
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            canvasCtx.fillStyle = '#0f172a00'; // Transparent clear
            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2;

                // Dynamic gradient
                const gradient = canvasCtx.createLinearGradient(0, 0, 0, canvas.height);
                gradient.addColorStop(0, '#3b82f6'); // Blue
                gradient.addColorStop(1, '#8b5cf6'); // Purple

                canvasCtx.fillStyle = gradient;

                // Draw mirrored bars for waveform effect
                canvasCtx.fillRect(x, (canvas.height - barHeight) / 2, barWidth, barHeight);

                x += barWidth + 1;
            }
        };

        draw();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            if (sourceRef.current) sourceRef.current.disconnect();
            if (audioContextRef.current?.state !== 'closed') {
                // Don't close context as it might be shared, just disconnect source
            }
        };
    }, [stream, isAiSpeaking]);

    if (isAiSpeaking) return null; // Hide when AI is speaking (resume Orb)

    return (
        <canvas
            ref={canvasRef}
            width={300}
            height={100}
            className="w-full h-full absolute inset-0 z-20 opacity-80"
        />
    );
};
