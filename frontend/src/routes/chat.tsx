import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Mic, Send, AlertTriangle, MessageSquareText } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/Avatar";
import { StatusBadge } from "@/components/Badges";
import { useApp } from "@/context/AppContext";
import { startConversation, sendMessage, transcribeAudio, respondToVoice } from "@/services/api";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import type { ConversationMessage, Status, Urgency } from "@/types";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "Chat — Ranting Chant" }] }),
  component: ChatPage,
});

function ChatPage() {
  const { currentTenant } = useApp();
  const name = currentTenant?.name ?? "John Carter";
  const unit = currentTenant?.unit ?? "3B";
  const tenantId = currentTenant?.id ?? "tenant_001";

  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("pending");
  const [urgency, setUrgency] = useState<Urgency>("low");
  const [escalated, setEscalated] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const { isRecording, audioBlob, startRecording, stopRecording, resetRecording } = useVoiceRecorder();

  // On mount: start conversation
  useEffect(() => {
    const initConversation = async () => {
      try {
        const response = await startConversation({
          tenant_id: tenantId,
          message: "Hello, I need help with a property issue."
        });
        setRequestId(response.request_id);
        setMessages(response.conversation);
        setStatus(response.request_status || "pending");
        setUrgency(response.urgency || "low");
        setEscalated(response.escalated || false);
      } catch (error) {
        console.error("Failed to start conversation:", error);
        // Fallback to mock greeting if API fails
        setMessages([{
          id: "1",
          role: "ai",
          text: `Hello ${name}! I'm Ranting Chant, your property operations assistant. How can I help you today?`,
          timestamp: new Date().toISOString()
        }]);
      }
    };

    initConversation();
  }, [tenantId, name]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  async function send() {
    const t = input.trim();
    if (!t || !requestId) return;

    const now = new Date().toISOString();
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "tenant", text: t, timestamp: now }]);
    setInput("");
    setTyping(true);

    try {
      const response = await sendMessage({
        request_id: requestId,
        tenant_id: tenantId,
        message: t
      });

      setMessages((m) => [...m, ...response.conversation]);
      setStatus(response.request_status || status);
      setUrgency(response.urgency || urgency);
      setEscalated(response.escalated || false);
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((m) => [...m, {
        id: crypto.randomUUID(),
        role: "ai",
        text: "Sorry, I'm having trouble connecting. Please try again.",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setTyping(false);
    }
  }

  async function handleVoiceToggle() {
    if (isRecording) {
      stopRecording();
    } else {
      try {
        await startRecording();
      } catch (error) {
        console.error("Failed to start recording:", error);
      }
    }
  }

  // Handle voice recording completion
  useEffect(() => {
    if (audioBlob && !isRecording) {
      handleVoiceSubmit();
    }
  }, [audioBlob, isRecording]);

  async function handleVoiceSubmit() {
    if (!audioBlob || !requestId) return;

    setTyping(true);

    try {
      // Convert Blob to File for API
      const audioFile = new File([audioBlob], "recording.webm", { type: audioBlob.type });

      // Transcribe audio
      const transcribeResponse = await transcribeAudio(audioFile);
      const transcript = transcribeResponse.transcript;

      // Add transcript as tenant message
      const now = new Date().toISOString();
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: "tenant", text: transcript, timestamp: now }]);

      // Send to voice respond endpoint
      const voiceResponse = await respondToVoice({
        request_id: requestId,
        tenant_id: tenantId,
        transcript
      });

      // Add AI response
      setMessages((m) => [...m, {
        id: crypto.randomUUID(),
        role: "ai",
        text: voiceResponse.reply_text,
        timestamp: new Date().toISOString()
      }]);

      // Play audio response if available
      if (voiceResponse.audio_base64) {
        const audio = new Audio(`data:audio/mp3;base64,${voiceResponse.audio_base64}`);
        audio.play();
      }

      // Update status
      setStatus(voiceResponse.status);
      setUrgency(voiceResponse.urgency);
      setEscalated(voiceResponse.escalated);
    } catch (error) {
      console.error("Failed to process voice:", error);
      setMessages((m) => [...m, {
        id: crypto.randomUUID(),
        role: "ai",
        text: "Sorry, I couldn't process your voice message. Please try again.",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setTyping(false);
      resetRecording();
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-[1400px] gap-5 p-5">
      {/* Sidebar */}
      <aside className="glass-panel hidden w-[280px] shrink-0 flex-col p-5 md:flex">
        <Logo size="sm" className="mb-6" />

        <div className="flex items-center gap-3 mb-5">
          <Avatar name={name} size={48} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-ranting-ice">{name}</div>
            <div className="text-xs text-ranting-muted">Unit {unit}</div>
          </div>
        </div>

        <div className="mb-2 text-[10px] uppercase tracking-wider text-ranting-muted">Current request</div>
        <div className="mb-1 text-sm text-ranting-ice">Property Issue</div>
        <StatusBadge status={status} className="self-start" />
        {requestId && <div className="mt-2 text-[11px] text-ranting-muted">ID · {requestId}</div>}

        <div className="mt-auto pt-4">
          <Link to="/dashboard" className="glossy-btn-ghost flex items-center justify-center gap-2 px-3 py-2 text-sm">
            <MessageSquareText className="h-4 w-4" /> View My Requests
          </Link>
        </div>
      </aside>

      {/* Chat */}
      <section className="glass-panel-strong flex flex-1 flex-col overflow-hidden">
        {escalated && (
          <div className="flex items-center gap-2 border-b border-red-400/30 bg-red-500/10 px-5 py-3 text-sm text-red-200" style={{ boxShadow: "inset 0 0 24px rgba(239,68,68,0.25)" }}>
            <AlertTriangle className="h-4 w-4" />
            This request has been escalated — urgency: {urgency.toUpperCase()}
          </div>
        )}

        <div ref={scrollerRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
          {messages.map((m) => (
            <Bubble key={m.id} msg={m} />
          ))}
          {typing && (
            <div className="flex items-end gap-2">
              <Avatar name="Ranting Chant" size={28} />
              <div className="glass-panel flex items-center gap-1 px-4 py-3">
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ranting-sky" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ranting-sky" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ranting-sky" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              placeholder="Type your message…"
              className="aero-input flex-1 resize-none px-3.5 py-2.5 text-sm"
            />
            <button
              onClick={handleVoiceToggle}
              className={isRecording ? "mic-pulse rounded-[10px] p-2.5 text-white" : "glossy-btn p-2.5"}
              aria-label="Toggle mic"
              disabled={typing}
            >
              <Mic className="h-4 w-4" />
            </button>
            <button onClick={send} className="glossy-btn p-2.5" aria-label="Send">
              <Send className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-1.5 text-[11px] text-ranting-muted">
            {isRecording ? "Recording… tap mic to stop" : typing ? "Processing…" : "Press Enter to send · Shift+Enter for newline"}
          </div>
        </div>
      </section>
    </main>
  );
}

function Bubble({ msg }: { msg: ConversationMessage }) {
  const isTenant = msg.role === "tenant";
  const timestamp = new Date(msg.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  
  return (
    <div className={`flex items-end gap-2 ${isTenant ? "justify-end" : "justify-start"}`}>
      {!isTenant && <Avatar name="Ranting Chant" size={28} />}
      <div className={`max-w-[72%] ${isTenant ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div
          className={isTenant
            ? "rounded-2xl rounded-br-md px-4 py-2.5 text-sm text-ranting-ice"
            : "glass-panel px-4 py-2.5 text-sm text-ranting-ice"}
          style={isTenant ? {
            background: "linear-gradient(180deg, rgba(45,106,159,0.95), rgba(26,58,92,0.95))",
            border: "1px solid rgba(126,200,227,0.3)",
            boxShadow: "0 4px 14px rgba(45,106,159,0.4), inset 0 1px 0 rgba(255,255,255,0.18)",
          } : undefined}
        >
          {msg.text}
        </div>
        <span className={`px-1 text-[10px] text-ranting-muted ${isTenant ? "text-right" : "text-left"}`}>{timestamp}</span>
      </div>
    </div>
  );
}
