"use client";

import { useRef, useState } from "react";
import { transcribeAudio } from "@/lib/api";

export type VoiceRecorderState = "idle" | "recording" | "transcribing";

/** Records a voice message and transcribes it to real text via the backend
 * (Groq Whisper) — never sent or stored as an audio clip, only as the
 * words it heard, same as any other typed message. */
export function useVoiceRecorder(onTranscribed: (text: string) => void, onError: (err: unknown) => void) {
  const [state, setState] = useState<VoiceRecorderState>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function start() {
    if (state !== "idle") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setState("transcribing");
        try {
          const { text } = await transcribeAudio(blob);
          if (text.trim()) onTranscribed(text.trim());
        } catch (err) {
          onError(err);
        } finally {
          setState("idle");
        }
      };

      recorderRef.current = recorder;
      recorder.start();
      setState("recording");
    } catch (err) {
      onError(err);
    }
  }

  function stop() {
    recorderRef.current?.stop();
  }

  function toggle() {
    if (state === "recording") stop();
    else if (state === "idle") start();
  }

  return { state, toggle };
}
