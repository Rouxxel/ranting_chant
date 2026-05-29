import { Mic, Send } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { VoiceProviderCapability, VoiceProviderId } from "@/types";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onVoiceToggle: () => void;
  voiceProvider: VoiceProviderId;
  voiceProviders: VoiceProviderCapability[];
  onVoiceProviderChange: (provider: VoiceProviderId) => void;
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
  onVoiceProviderChange,
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
      <div className="mb-3 flex flex-col gap-1.5 sm:max-w-[250px]">
        <label className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ranting-muted">
          Voice Provider
        </label>
        <Select
          value={voiceProvider}
          onValueChange={(value) => onVoiceProviderChange(value as VoiceProviderId)}
          disabled={disabled || isRecording}
        >
          <SelectTrigger className="h-9 border-white/15 bg-white/8 text-ranting-ice shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <SelectValue placeholder="Select provider" />
          </SelectTrigger>
          <SelectContent className="border-white/15 bg-ranting-ink text-ranting-ice">
            {providerOptions.map((provider) => (
              <SelectItem key={provider.id} value={provider.id} disabled={!provider.enabled}>
                {provider.display_name}{provider.enabled ? "" : " (not configured)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
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
      <div className="mt-1.5 text-[11px] text-ranting-muted">
        {isRecording ? "Recording… tap mic to stop" : isTyping ? "Processing…" : "Press Enter to send · Shift+Enter for newline"}
      </div>
    </div>
  );
}
