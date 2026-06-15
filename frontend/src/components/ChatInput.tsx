import { Mic, Send } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Voice, VoiceProviderCapability, VoiceProviderId } from "@/types";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onVoiceToggle: () => void;
  voiceProvider: VoiceProviderId;
  voiceProviders: VoiceProviderCapability[];
  voiceId?: string;
  voices: Voice[];
  onVoiceProviderChange: (provider: VoiceProviderId) => void;
  onVoiceChange: (voiceId: string) => void;
  isRecording: boolean;
  isTyping: boolean;
  disabled?: boolean;
}

export function ChatInput({ 
  value, 
  onChange, 
  onSend, 
  onVoiceToggle, 
  voiceProvider,
  voiceProviders,
  voiceId,
  voices,
  onVoiceProviderChange,
  onVoiceChange,
  isRecording, 
  isTyping,
  disabled = false 
}: ChatInputProps) {
  const providerOptions = voiceProviders.length > 0
    ? voiceProviders
    : [{
        id: "elevenlabs" as VoiceProviderId,
        display_name: "ElevenLabs",
        configured: true,
        enabled: true,
        supports: { tts: true, stt: true, streaming_tts: false },
        voices: [],
      }];

  return (
    <div className="border-t border-white/10 p-4">
      {/*
      <div className="mb-3 grid gap-3 sm:grid-cols-[minmax(0,250px)_minmax(0,250px)]">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ranting-deep">
            Voice Provider
          </label>
          <Select
            value={voiceProvider}
            onValueChange={(value) => onVoiceProviderChange(value as VoiceProviderId)}
            disabled={disabled || isRecording}
          >
            <SelectTrigger className="h-9 border-ranting-sky/35 bg-ranting-deep text-ranting-ice shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_0_14px_rgba(45,106,159,0.22)]">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent className="aero-surface shadow-[0_16px_34px_rgba(0,0,0,0.45)]">
              {providerOptions.map((provider) => (
                <SelectItem key={provider.id} value={provider.id} disabled={!provider.enabled} className="aero-select-item">
                  {provider.display_name}{provider.enabled ? "" : " (not configured)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ranting-deep">
            Voice
          </label>
          <Select
            value={voiceId}
            onValueChange={onVoiceChange}
            disabled={disabled || isRecording || voices.length === 0}
          >
            <SelectTrigger className="h-9 border-ranting-sky/35 bg-ranting-deep text-ranting-ice shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_0_14px_rgba(45,106,159,0.22)]">
              <SelectValue placeholder={voices.length ? "Select voice" : "No voices"} />
            </SelectTrigger>
            <SelectContent className="aero-surface shadow-[0_16px_34px_rgba(0,0,0,0.45)]">
              {voices.map((voice) => (
                <SelectItem key={voice.id} value={voice.id} className="aero-select-item">
                  {voice.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      */}
      <div className="flex items-end gap-2">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          rows={1}
          placeholder="Type your message…"
          className="aero-input flex-1 resize-none px-3.5 py-2.5 text-sm"
          disabled={disabled}
        />
        <button
          onClick={onVoiceToggle}
          className={isRecording ? "mic-pulse rounded-[10px] p-2.5 text-white" : "glossy-btn p-2.5"}
          aria-label="Toggle mic"
          disabled={isTyping || disabled}
        >
          <Mic className="h-4 w-4" />
        </button>
        <button onClick={onSend} className="glossy-btn p-2.5" aria-label="Send" disabled={disabled}>
          <Send className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-1.5 text-[11px] text-ranting-deep">
        {isRecording ? "Recording… tap mic to stop" : isTyping ? "Processing…" : "Press Enter to send · Shift+Enter for newline"}
      </div>
    </div>
  );
}
