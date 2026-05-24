import { Avatar } from "@/components/Avatar";
import type { ConversationMessage } from "@/types";

interface MessageBubbleProps {
  msg: ConversationMessage;
  tenantName?: string;
}

export function MessageBubble({ msg, tenantName = "Tenant" }: MessageBubbleProps) {
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
          {msg.message}
        </div>
        <span className={`px-1 text-[10px] text-ranting-muted ${isTenant ? "text-right" : "text-left"}`}>{timestamp}</span>
      </div>
    </div>
  );
}
