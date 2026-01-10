
import { useRef, useState, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { LiveStatus, JournalEntry } from './types';
import { SYSTEM_INSTRUCTION, TOOLS } from './constants';
import { arrayBufferToBase64, base64ToUint8Array, decodeAudioData, float32ToInt16PCM } from './utils';

export function useLiveSession(
    apiKey: string | undefined,
    onToolCall: (name: string, args: any) => Promise<any>, 
    journals: JournalEntry[]
) {
    const [isLiveMode, setIsLiveMode] = useState(false);
    const [liveStatus, setLiveStatus] = useState<LiveStatus>('disconnected');
    const [volumeLevel, setVolumeLevel] = useState(0);

    const liveSessionRef = useRef<any>(null);
    const audioContextInputRef = useRef<AudioContext | null>(null);
    const audioContextOutputRef = useRef<AudioContext | null>(null);
    const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const sourceNodesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    
    // Transcript Accumulator for Post-Session Analysis
    const transcriptRef = useRef<string>("");

    useEffect(() => {
        return () => {
            stopLiveSession();
        };
    }, []);

    const startVisualizer = () => {
        const draw = () => {
            if (!analyserRef.current) return;
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const norm = Math.min(1, (sum / dataArray.length) / 128);
            setVolumeLevel(norm);
            animationFrameRef.current = requestAnimationFrame(draw);
        };
        draw();
    };

    const processSessionRetrospective = async (fullTranscript: string) => {
        if (!apiKey || !fullTranscript.trim()) return;
        
        console.log("Processing Session Retrospective...");
        
        try {
            const ai = new GoogleGenAI({ apiKey });
            const prompt = `
            You are the "Sanctum Executive Processor". 
            You have just received a transcript of a voice conversation between the user and their Second Self.
            
            YOUR JOB:
            1. Analyze the transcript for any actionable intent (creating tasks, updating tasks, journaling).
            2. If the user mentioned doing something, mark it done.
            3. If the user vented, log a journal entry.
            4. EXECUTE the necessary tools to update the database.
            
            TRANSCRIPT LOG:
            ${fullTranscript}
            `;

            const result = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { tools: TOOLS }
            });

            // Handle Tool Calls
            const candidates = result.candidates;
            if (candidates && candidates.length > 0 && candidates[0].content?.parts) {
                for (const part of candidates[0].content.parts) {
                    if (part.functionCall) {
                        const fc = part.functionCall;
                        console.log(`[Retrospective] Executing: ${fc.name}`);
                        await onToolCall(fc.name, fc.args);
                    }
                }
            }
        } catch (e) {
            console.error("Retrospective Failed", e);
        }
    };

    const stopLiveSession = () => {
        // 1. Trigger Retrospective Analysis before clearing refs
        if (transcriptRef.current && transcriptRef.current.length > 20) {
            processSessionRetrospective(transcriptRef.current);
        }

        // 2. Cleanup Audio/WebSockets
        if (liveSessionRef.current) {
            liveSessionRef.current.then((s: any) => { 
                try { s.close(); } catch(e) { console.error("Session close error", e); } 
            });
            liveSessionRef.current = null;
        }
        
        if (processorRef.current) { 
            processorRef.current.disconnect(); 
            processorRef.current = null; 
        }
        
        if (inputSourceRef.current) {
            inputSourceRef.current.disconnect();
            inputSourceRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }

        if (audioContextInputRef.current) {
            audioContextInputRef.current.close();
            audioContextInputRef.current = null;
        }
        
        if (audioContextOutputRef.current) {
            audioContextOutputRef.current.close();
            audioContextOutputRef.current = null;
        }

        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        
        sourceNodesRef.current.forEach(node => { try { node.stop(); } catch(e) {} });
        sourceNodesRef.current.clear();

        setIsLiveMode(false);
        setLiveStatus('disconnected');
        setVolumeLevel(0);
        // Do not clear transcript immediately so we can process it, but the ref is local so it's fine.
        transcriptRef.current = ""; 
    };

    const startLiveSession = async () => {
        if (!apiKey) {
            alert("No API Key found");
            return;
        }
        
        stopLiveSession();
        setIsLiveMode(true);
        setLiveStatus('connecting');
        transcriptRef.current = ""; 

        try {
            const ai = new GoogleGenAI({ apiKey });
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const inputCtx = new AudioContextClass({ sampleRate: 16000 });
            const outputCtx = new AudioContextClass({ sampleRate: 24000 });
            
            await inputCtx.resume();
            await outputCtx.resume();

            audioContextInputRef.current = inputCtx;
            audioContextOutputRef.current = outputCtx;
            nextStartTimeRef.current = 0;

            const analyser = outputCtx.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;
            const outputGain = outputCtx.createGain();
            outputGain.connect(analyser);
            analyser.connect(outputCtx.destination);

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Context Construction
            const today = new Date().toISOString().split('T')[0];
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            const yJournal = journals.find(j => j.date === yesterday);
            
            let contextInstruction = `\n\n[LIVE SESSION CONTEXT]\nCurrent Date: ${today}`;
            if (yJournal) {
                contextInstruction += `\nYesterday's Journal Summary: "${yJournal.summary}"\nMood: ${yJournal.mood}`;
            }

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-12-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    systemInstruction: SYSTEM_INSTRUCTION + contextInstruction,
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                    },
                    // CORRECT CONFIG: Empty objects enable default transcription
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
                callbacks: {
                    onopen: () => {
                        console.log("Sanctum Live Connected");
                        setLiveStatus('connected');
                        
                        const source = inputCtx.createMediaStreamSource(stream);
                        inputSourceRef.current = source;

                        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
                        processorRef.current = processor;
                        
                        processor.onaudioprocess = (e) => {
                            const inputData = e.inputBuffer.getChannelData(0);
                            const pcmData = float32ToInt16PCM(inputData);
                            const base64Data = arrayBufferToBase64(pcmData.buffer);
                            
                            sessionPromise.then(session => {
                                session.sendRealtimeInput({
                                    media: {
                                        mimeType: 'audio/pcm;rate=16000',
                                        data: base64Data
                                    }
                                });
                            });

                            let sum = 0;
                            for(let i=0; i<inputData.length; i++) sum += inputData[i]*inputData[i];
                            const rms = Math.sqrt(sum/inputData.length);
                            setVolumeLevel(v => Math.max(v, rms * 5)); 
                        };
                        
                        source.connect(processor);
                        processor.connect(inputCtx.destination);
                    },
                    onmessage: async (msg: LiveServerMessage) => {
                        // Capture Transcripts for Retrospective
                        if (msg.serverContent?.inputTranscription?.text) {
                            transcriptRef.current += `[USER]: ${msg.serverContent.inputTranscription.text}\n`;
                        }
                        if (msg.serverContent?.outputTranscription?.text) {
                            transcriptRef.current += `[SANCTUM]: ${msg.serverContent.outputTranscription.text}\n`;
                        }

                        // Handle Audio
                        const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (base64Audio) {
                            try {
                                const rawBytes = base64ToUint8Array(base64Audio);
                                const buffer = await decodeAudioData(rawBytes, outputCtx, 24000, 1);
                                
                                const now = outputCtx.currentTime;
                                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, now);
                                
                                const source = outputCtx.createBufferSource();
                                source.buffer = buffer;
                                source.connect(outputGain);
                                source.start(nextStartTimeRef.current);
                                nextStartTimeRef.current += buffer.duration;
                                
                                sourceNodesRef.current.add(source);
                                source.onended = () => sourceNodesRef.current.delete(source);
                            } catch (e) { console.error(e); }
                        }

                        if (msg.serverContent?.interrupted) {
                            sourceNodesRef.current.forEach(node => { try { node.stop(); } catch(e) {} });
                            sourceNodesRef.current.clear();
                            nextStartTimeRef.current = 0;
                            transcriptRef.current += `[INTERRUPTION]\n`;
                        }
                    },
                    onclose: (e) => { 
                        console.log("Sanctum Live Closed", e);
                        setLiveStatus('disconnected'); 
                        stopLiveSession(); 
                    },
                    onerror: (e) => {
                        console.error("Sanctum Live Error", e);
                        setLiveStatus('error');
                    }
                }
            });
            
            liveSessionRef.current = sessionPromise;
            startVisualizer();

        } catch (e) {
            console.error("Live Session Start Error", e);
            setLiveStatus('error');
        }
    };

    return {
        isLiveMode,
        liveStatus,
        volumeLevel,
        startLiveSession,
        stopLiveSession
    };
}
