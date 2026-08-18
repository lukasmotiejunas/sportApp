import { useEffect, useRef, useState, useCallback } from "react";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { useStore } from "../store/useStore";
import { Avatar } from "../components/ui/Avatar";
import { PageTitle } from "../components/layout/PageTitle";
import {
  fetchChatMessages,
  sendChatMessage,
  deleteChatMessage,
} from "../api/endpoints";
import type { ClubMessage } from "../types";

const POLL_INTERVAL = 5000;

const roleLabel: Record<ClubMessage["authorType"], string> = {
  member: "Narys",
  coach: "Treneris",
  admin: "Adminas",
};

const roleTone: Record<ClubMessage["authorType"], string> = {
  member: "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300",
  coach: "bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-300",
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-400/15 dark:text-blue-300",
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (sameDay) {
    return d.toLocaleTimeString("lt-LT", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleString("lt-LT", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ClubChat() {
  const authUser = useStore((s) => s.authUser);
  const push = useStore((s) => s.pushToast);

  const [messages, setMessages] = useState<ClubMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const latestIdRef = useRef<string | null>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  };

  const loadMessages = useCallback(
    async (silent = false) => {
      try {
        const data = await fetchChatMessages();
        setMessages(data);
        const newest = data[data.length - 1]?.id ?? null;
        if (newest && newest !== latestIdRef.current) {
          latestIdRef.current = newest;
          scrollToBottom(silent ? "smooth" : "instant");
        }
      } catch {
        if (!silent) push({ kind: "error", message: "Nepavyko įkelti žinučių." });
      } finally {
        setLoading(false);
      }
    },
    [push],
  );

  useEffect(() => {
    void loadMessages(false);
    const timer = setInterval(() => void loadMessages(true), POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [loadMessages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const msg = await sendChatMessage(trimmed);
      setMessages((prev) => [...prev, msg]);
      latestIdRef.current = msg.id;
      setBody("");
      textareaRef.current?.focus();
      scrollToBottom();
    } catch {
      push({ kind: "error", message: "Nepavyko išsiųsti žinutės." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteChatMessage(id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch {
      push({ kind: "error", message: "Nepavyko ištrinti žinutės." });
    }
  };

  const canDelete = (msg: ClubMessage) => {
    if (!authUser) return false;
    if (
      authUser.role === "admin" ||
      authUser.role === "coach" ||
      authUser.role === "super_admin"
    )
      return true;
    return msg.authorId === authUser.id;
  };

  return (
    <div className="flex flex-col" style={{ minHeight: "calc(100vh - 12rem)" }}>
      <PageTitle title="Klubo pokalbiai" />

      <div className="surface flex flex-1 flex-col overflow-hidden">
        {/* Message list */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-sm text-ink-500">Kraunama…</p>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-lime-100 text-lime-700 dark:bg-lime-400/15 dark:text-lime-300">
                <MessageCircle className="h-6 w-6" />
              </span>
              <p className="font-display font-bold text-ink-900 dark:text-ink-50">
                Pokalbių dar nėra
              </p>
              <p className="mt-1 text-sm text-ink-500">
                Būkite pirmas — parašykite žinutę!
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {messages.map((m) => {
                const isMe = m.authorId === authUser?.id;
                return (
                  <li
                    key={m.id}
                    className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}
                  >
                    <div className="shrink-0"><Avatar name={m.authorName} size="sm" photoUrl={m.authorPhoto ?? undefined} color={m.authorColor ?? undefined} /></div>
                    <div
                      className={`group flex max-w-[75%] flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div className={`flex flex-wrap items-center gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                        <span className="text-sm font-semibold">{m.authorName}</span>
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${roleTone[m.authorType]}`}
                        >
                          {roleLabel[m.authorType]}
                        </span>
                        <span className="text-xs text-ink-400">
                          {formatTime(m.createdAt)}
                        </span>
                        {canDelete(m) && (
                          <button
                            type="button"
                            onClick={() => handleDelete(m.id)}
                            className="hidden text-ink-300 hover:text-red-500 group-hover:block"
                            aria-label="Ištrinti žinutę"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <div
                        className={`rounded-2xl px-3.5 py-2.5 text-sm ${
                          isMe
                            ? "rounded-tr-sm bg-lime-500 text-white dark:bg-lime-500"
                            : "rounded-tl-sm bg-ink-100 text-ink-900 dark:bg-ink-800 dark:text-ink-50"
                        }`}
                      >
                        {m.body}
                      </div>
                    </div>
                  </li>
                );
              })}
              <div ref={bottomRef} />
            </ul>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-ink-100 p-3 dark:border-ink-800">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                  handleSubmit(e as any);
              }}
              placeholder="Rašykite žinutę… (⌘Enter siųsti)"
              rows={1}
              className="input flex-1 resize-none py-2 text-sm"
            />
            <button
              type="submit"
              disabled={submitting || !body.trim()}
              className="btn-primary self-end px-3"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
