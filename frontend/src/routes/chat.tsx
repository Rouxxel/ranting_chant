import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Mic, Send, AlertTriangle, MessageSquareText } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/Avatar";
import { StatusBadge } from "@/components/Badges";
import { getSession } from "@/lib/session";
import { requests } from "@/data/mockData";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "Chat — Ranting Chant" }] }),
  component: ChatPage,
});

type Msg = { id: string; role: "ai" | "tenant"; text: string; timestamp: string };

const seed: Msg[] = [
  { id: "1", role: "ai", text: "Hello John! I'm Ranting Chant, your property operations assistant. How can I help you today?", timestamp: "10:02 AM" },
  { id: "2", role: "tenant", text: "I lost my apartment key", timestamp: "10:03 AM" },
  { id: "3", role: "ai", text: "I'm sorry to hear that. Was the key lost or stolen?", timestamp: "10:03 AM" },
  { id: "4", role: "tenant", text: "Lost", timestamp: "10:04 AM" },
  { id: "5", role: "ai", text: "Do you still have access to your apartment?", timestamp: "10:04 AM" },
];

function ChatPage() {
  const session = getSession();
  const name = session?.name ?? "John Carter";
  const unit = session?.unit ?? "3B";

  const [messages, setMessages] = useState<Msg[]>(seed);
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);
  const [typing, setTyping] = useState(false);
  const [escalated] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  function send() {
    const t = input.trim();
    if (!t) return;
    const now = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "tenant", text: t, timestamp: now }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "ai",
          text: "Thanks — I've noted that. I'll loop in your property manager and follow up shortly.",
          timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
        },
      ]);
    }, 1100);
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
        <div className="mb-1 text-sm text-ranting-ice">Key Replacement</div>
        <StatusBadge status="in_progress" className="self-start" />
        <div className="mt-2 text-[11px] text-ranting-muted">ID · REQ-1001</div>

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
            This request has been escalated — urgency: HIGH
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
              onClick={() => setRecording((r) => !r)}
              className={recording ? "mic-pulse rounded-[10px] p-2.5 text-white" : "glossy-btn p-2.5"}
              aria-label="Toggle mic"
            >
              <Mic className="h-4 w-4" />
            </button>
            <button onClick={send} className="glossy-btn p-2.5" aria-label="Send">
              <Send className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-1.5 text-[11px] text-ranting-muted">
            {recording ? "Recording… tap mic to stop" : "Press Enter to send · Shift+Enter for newline"}
          </div>
        </div>
      </section>
    </main>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const isTenant = msg.role === "tenant";
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
        <span className={`px-1 text-[10px] text-ranting-muted ${isTenant ? "text-right" : "text-left"}`}>{msg.timestamp}</span>
      </div>
    </div>
  );
}

// Suppress unused-import lint
void requests;
