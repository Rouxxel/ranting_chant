import { Mic, Send } from "lucide-react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onVoiceToggle: () => void;
  isRecording: boolean;
  isTyping: boolean;
  disabled?: boolean;
}

export function ChatInput({ 
  value, 
  onChange, 
  onSend, 
  onVoiceToggle, 
  isRecording, 
  isTyping,
  disabled = false 
}: ChatInputProps) {
  return (
    <div className="border-t border-white/10 p-4">
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
