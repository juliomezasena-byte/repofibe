import { useCallback, useRef, useState } from 'react';

export function useSpeech({ lang = 'es-ES' } = {}) {
  const RecognitionCtor = typeof window !== 'undefined'
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;
  const supported = Boolean(RecognitionCtor && typeof window !== 'undefined' && window.speechSynthesis);

  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const startListening = useCallback((onResult, onError) => {
    if (!supported) return;
    const recognition = new RecognitionCtor();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      onResult(text);
    };
    recognition.onerror = (event) => {
      onError?.(event.error);
      setListening(false);
    };
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }, [supported, lang, RecognitionCtor]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const speak = useCallback((text) => {
    if (!supported) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  }, [supported, lang]);

  return { supported, listening, startListening, stopListening, speak };
}
