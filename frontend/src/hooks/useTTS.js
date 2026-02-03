import { useState, useCallback } from 'react';

export const useTTS = () => {
    const [speaking, setSpeaking] = useState(false);

    const speak = useCallback((text) => {
        if (!window.speechSynthesis) {
            console.error("TTS: Speech Synthesis not supported");
            return;
        }

        console.log("TTS: Speaking ->", text);
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            console.log(`TTS: Found ${voices.length} voices`);
            const preferredVoice = voices.find(v => v.name.includes("Google") && v.lang.includes("en")) || voices[0];
            if (preferredVoice) {
                console.log("TTS: Using voice ->", preferredVoice.name);
                utterance.voice = preferredVoice;
            }
        };

        loadVoices();
        if (window.speechSynthesis.getVoices().length === 0) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }

        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => {
            console.log("TTS: Started");
            setSpeaking(true);
        };
        utterance.onend = () => {
            console.log("TTS: Ended");
            setSpeaking(false);
            // Force small delay before allowing mic to ensure audio clear
            setTimeout(() => {
                setSpeaking(false);
            }, 100);
        };
        utterance.onerror = (e) => {
            console.error("TTS: Error", e);
            setSpeaking(false);
        };

        window.speechSynthesis.speak(utterance);
    }, []);

    const cancel = useCallback(() => {
        window.speechSynthesis.cancel();
    }, []);

    return { speak, cancel, speaking };
};
