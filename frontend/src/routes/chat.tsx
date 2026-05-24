import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, MessageSquareText } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/Avatar";
import { StatusBadge } from "@/components/Badges";
import { MessageBubble } from "@/components/MessageBubble";
import { ChatInput } from "@/components/ChatInput";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [isLoading, setIsLoading] = useState(true);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("pending");
  const [urgency, setUrgency] = useState<Urgency>("low");
  const [escalated, setEscalated] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const { isRecording, audioBlob, startRecording, stopRecording, resetRecording } = useVoiceRecorder();

  // On mount: start conversation
  useEffect(() => {
    const initConversation = async () => {
      setIsLoading(true);
      try {
        const response = await startConversation({
          tenant_id: tenantId,
          message: "Hello, I need help with a property issue."
        });
        setRequestId(response.request_id);
        // Backend returns greeting, not conversation
        setMessages([{
          id: crypto.randomUUID(),
          role: "ai",
          text: response.greeting || `Hello ${name}! I'm Ranting Chant, your property operations assistant. How can I help you today?`,
          timestamp: new Date().toISOString()
        }]);
        setStatus("pending");
        setUrgency("low");
        setEscalated(false);
      } catch (error) {
        console.error("Failed to start conversation:", error);
        // Fallback to mock greeting if API fails
        setMessages([{
          id: "1",
          role: "ai",
          text: `Hello ${name}! I'm Ranting Chant, your property operations assistant. How can I help you today?`,
          timestamp: new Date().toISOString()
        }]);
      } finally {
        setIsLoading(false);
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

      // Backend returns reply, not conversation array
      setMessages((m) => [...m, {
        id: crypto.randomUUID(),
        role: "ai",
        text: response.reply,
        timestamp: new Date().toISOString()
      }]);
      setStatus(response.status);
      setUrgency(response.urgency);
      setEscalated(response.escalated);
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
          {isLoading ? (
            <div className="space-y-4">
              <div className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-16 w-3/4 rounded-2xl" />
                </div>
              </div>
            </div>
          ) : messages.map((m) => (
            <MessageBubble key={m.id} msg={m} tenantName={name} />
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
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={send}
          onVoiceToggle={handleVoiceToggle}
          isRecording={isRecording}
          isTyping={typing}
        />
      </section>
    </main>
  );
}
