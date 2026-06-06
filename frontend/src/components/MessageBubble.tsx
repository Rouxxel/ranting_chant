import { Avatar } from "@/components/Avatar";
import { ExternalLink } from "lucide-react";
import type { ConversationMessage } from "@/types";

interface MessageBubbleProps {
  msg: ConversationMessage;
  tenantName?: string;
}

function renderLinkedText(text: string) {
  const parts = text.split(/(https?:\/\/[^\s)]+)/g);

  return parts.map((part, index) => {
    if (!part.startsWith("http")) {
      return <span key={`${part}-${index}`}>{part}</span>;
    }

    const href = part.replace(/[.,;:!?]+$/, "");
    const trailing = part.slice(href.length);

    return (
      <span key={`${href}-${index}`}>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-ranting-sky underline decoration-ranting-sky/40 underline-offset-2 hover:text-ranting-ice"
        >
          {href}
        </a>
        {trailing}
      </span>
    );
  });
}

export function MessageBubble({ msg, tenantName = "Tenant" }: MessageBubbleProps) {
  const isTenant = msg.role === "tenant";
  const timestamp = new Date(msg.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const sources = msg.web_results?.results?.slice(0, 3) ?? [];

  return (
    <div className={`wrap-break-words flex items-end gap-2 ${isTenant ? "justify-end" : "justify-start"}`}>
      {!isTenant && <Avatar name="Ranting Chant" size={28} />}
      <div className={`max-w-[72%] ${isTenant ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div
          className={`glass-panel px-4 py-2.5 text-sm text-ranting-ice ${isTenant ? "rounded-br-md" : ""}`}
        >
          <div className="whitespace-pre-wrap break-words">{renderLinkedText(msg.message)}</div>
        </div>
        {!isTenant && sources.length > 0 && (
          <div className="mt-1 w-full max-w-[560px] rounded-sm border border-ranting-sky/20 bg-ranting-navy/45 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="ml-3 mb-2 wrap-break-words text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: "#1e3a5f" }}>
              Sources
            </div>
            <div className="wrap-break-words grid gap-2">
              {sources.map((source) => (
                <a
                  key={`${source.url}-${source.title}`}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group rounded-xl wrap-break-words bg-white/40 border border-white/40 p-3 transition hover:border-ranting-sky/40 hover:bg-white/70"
                >
                  <div className="wrap-break-words flex items-start justify-between gap-3">
                    <div className="text-xs font-semibold" style={{ color: "#0f2b4a" }}>
                      {source.title}
                    </div>
                    <ExternalLink className="wrap-break-words mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "#163a5e" }} />
                  </div>
                  {source.content_snippet && (
                    <p className="wrap-break-words mt-1 line-clamp-2 text-[11px] leading-4" style={{ color: "#1e3a5f" }}>
                      {source.content_snippet}
                    </p>
                  )}
                  <div className="wrap-break-words mt-2 truncate text-[10px]" style={{ color: "#1a4060" }}>
                    {source.url}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
        <span className={`px-1 text-[10px] text-ranting-muted ${isTenant ? "text-right" : "text-left"}`}>{timestamp}</span>
      </div>
    </div>
  );
}
