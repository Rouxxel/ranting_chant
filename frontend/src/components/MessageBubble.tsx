import { useState } from "react";
import { Avatar } from "@/components/Avatar";
import { ExternalLink, Check, X } from "lucide-react";
import type { ConversationMessage, SuggestedContact } from "@/types";
import { sendNotifications } from "@/services/api";
import { toast } from "sonner";

interface MessageBubbleProps {
  msg: ConversationMessage;
  tenantName?: string;
  suggestedContacts?: SuggestedContact[];
  tenantId?: string;
  requestId?: string;
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

export function MessageBubble({ msg, tenantName = "Tenant", suggestedContacts = [], tenantId, requestId }: MessageBubbleProps) {
  const isTenant = msg.role === "tenant";
  const timestamp = new Date(msg.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const sources = msg.web_results?.results?.slice(0, 3) ?? [];
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const toggleContact = (contactName: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactName)) {
      newSelected.delete(contactName);
    } else {
      newSelected.add(contactName);
    }
    setSelectedContacts(newSelected);
  };

  const handleSendNotifications = async () => {
    if (!tenantId || !requestId || selectedContacts.size === 0) return;

    // Don't allow sending notifications for unsaved conversations (session_id)
    if (requestId.startsWith("session_")) {
      toast.error("Please save the conversation first before sending notifications");
      return;
    }

    setIsSending(true);
    try {
      const contactsToSend = suggestedContacts.filter(c => selectedContacts.has(c.name));
      const result = await sendNotifications({
        tenant_id: tenantId,
        request_id: requestId,
        contacts: contactsToSend
      });

      if (result.success) {
        toast.success(`Sent ${result.sent} of ${result.total} notification(s)`);
        setShowSuggestions(false);
      } else {
        toast.error("Failed to send some notifications");
      }
    } catch (error) {
      toast.error("Failed to send notifications");
    } finally {
      setIsSending(false);
    }
  };

  const handleDismiss = () => {
    setShowSuggestions(false);
  };

  return (
    <div className={`wrap-break-words flex items-end gap-2 ${isTenant ? "justify-end" : "justify-start"}`}>
      {!isTenant && <Avatar name="Ranting Chant" size={28} />}
      <div className={`max-w-[72%] ${isTenant ? "items-end" : "items-start"} flex flex-col gap-1`}>
        <div
          className={`glass-panel px-4 py-2.5 text-sm text-ranting-ice ${isTenant ? "rounded-br-md" : ""}`}
        >
          <div className="whitespace-pre-wrap break-words">{renderLinkedText(msg.message)}</div>
        </div>
        {!isTenant && suggestedContacts.length > 0 && showSuggestions && (
          <div className="mt-2 w-full max-w-[560px] rounded-sm border border-ranting-sky/20 bg-ranting-navy/45 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="mb-3 wrap-break-words text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "#1e3a5f" }}>
              Suggested Contacts
            </div>
            <div className="wrap-break-words space-y-2">
              {suggestedContacts.map((contact) => (
                <div
                  key={contact.name}
                  onClick={() => toggleContact(contact.name)}
                  className={`group flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                    selectedContacts.has(contact.name)
                      ? "border-ranting-sky/60 bg-ranting-sky/20"
                      : "border-white/30 bg-white/30 hover:border-ranting-sky/40 hover:bg-white/50"
                  }`}
                >
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full border transition ${
                    selectedContacts.has(contact.name)
                      ? "border-ranting-sky bg-ranting-sky"
                      : "border-ranting-muted bg-white/50"
                  }`}>
                    {selectedContacts.has(contact.name) && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold" style={{ color: "#0f2b4a" }}>
                      {contact.name} ({contact.type})
                    </div>
                    <div className="mt-0.5 text-[10px]" style={{ color: "#1e3a5f" }}>
                      {contact.reason}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleSendNotifications}
                disabled={isSending || selectedContacts.size === 0 || !!requestId?.startsWith("session_")}
                className="glossy-btn flex-1 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                title={requestId?.startsWith("session_") ? "Save conversation first" : ""}
              >
                {isSending ? "Sending..." : requestId?.startsWith("session_") ? "Save conversation first" : `Send (${selectedContacts.size})`}
              </button>
              <button
                onClick={handleDismiss}
                className="glossy-btn-ghost px-3 py-1.5 text-xs font-medium"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
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
