import { useEffect, useRef, useCallback, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Menu } from "lucide-react";

import ChatSidebar   from "../../components/chat/ChatSidebar";
import MessageBubble from "../../components/chat/MessageBubble";
import ChatInput     from "../../components/chat/ChatInput";
import AppFooter     from "../../components/AppFooter";

import useChatStore  from "../../store/chatStore";
import useSSEStream  from "../../hooks/useSSEStream";
import { useDocuments } from "../../hooks/useDocuments";
import { createSession, listSessions, deleteSession, getMessages } from "../../api/chat";

const EmptyState = ({ onNewChat }) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 sm:px-8">
    <div
      className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl"
      style={{ background: "rgba(212,168,86,0.06)", border: "1px solid rgba(212,168,86,0.15)" }}
    >
      <Sparkles size={26} style={{ color: "#D4A856" }} />
    </div>
    <div className="text-center">
      <h2 className="mb-2 text-lg sm:text-xl font-semibold" style={{ color: "#E2E8F8" }}>
        Ask StudyMind anything
      </h2>
      <p className="max-w-sm text-sm leading-relaxed" style={{ color: "rgba(180,195,230,0.45)" }}>
        Start a new chat, or select a document from the sidebar to get
        contextual AI answers with source citations.
      </p>
    </div>
    <button
      onClick={() => onNewChat()}
      className="rounded-xl px-5 py-2.5 text-sm font-medium transition-all cursor-pointer hover:opacity-80"
      style={{
        background: "linear-gradient(135deg, #D4A85622, #E8B89422)",
        border: "1px solid rgba(212,168,86,0.3)",
        color: "#D4A856",
      }}
    >
      Start new chat
    </button>
  </div>
);

const ChatPage = () => {
  const sessions          = useChatStore((s) => s.sessions);
  const setSessions       = useChatStore((s) => s.setSessions);
  const addSession        = useChatStore((s) => s.addSession);
  const removeSession     = useChatStore((s) => s.removeSession);
  const activeSessionId   = useChatStore((s) => s.activeSessionId);
  const setActiveSession  = useChatStore((s) => s.setActiveSession);
  const messagesBySession = useChatStore((s) => s.messagesBySession);
  const setMessages       = useChatStore((s) => s.setMessages);
  const appendMessage     = useChatStore((s) => s.appendMessage);
  const isStreaming       = useChatStore((s) => s.isStreaming);
  const streamingContent  = useChatStore((s) => s.streamingContent);
  const streamingSources  = useChatStore((s) => s.streamingSources);

  const { streamMessage } = useSSEStream();
  const messagesEndRef    = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { documents, uploading, uploadProgress, upload: uploadDoc, remove: removeDoc } = useDocuments();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await listSessions();
        setSessions(res.data);
      } catch {
        toast.error("Failed to load chat history");
      }
    };
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesBySession, streamingContent]);

  useEffect(() => {
    if (!activeSessionId) return;
    if (messagesBySession[activeSessionId]) return;
    const load = async () => {
      try {
        const res = await getMessages(activeSessionId);
        setMessages(activeSessionId, res.data);
      } catch {
        toast.error("Failed to load messages");
      }
    };
    load();
  }, [activeSessionId, messagesBySession, setMessages]);

  const handleNewChat = useCallback(
    async (documentId = null, documentName = null) => {
      try {
        const res = await createSession(documentId, documentName);
        const session = res.data;
        addSession(session);
        setActiveSession(session.id);
        setMessages(session.id, []);
      } catch {
        toast.error("Failed to create session");
      }
    },
    [addSession, setActiveSession, setMessages]
  );

  const handleSelectSession = useCallback(
    (sessionId) => setActiveSession(sessionId),
    [setActiveSession]
  );

  const handleDeleteSession = useCallback(
    async (sessionId) => {
      try {
        await deleteSession(sessionId);
        removeSession(sessionId);
        toast.success("Chat deleted");
      } catch {
        toast.error("Failed to delete chat");
      }
    },
    [removeSession]
  );

  const handleSend = useCallback(
    async (content) => {
      if (!activeSessionId) return;
      const userMsg = {
        id: `user-${Date.now()}`,
        session_id: activeSessionId,
        role: "user",
        content,
        sources: [],
        created_at: new Date().toISOString(),
      };
      appendMessage(activeSessionId, userMsg);
      const activeSession = sessions.find((s) => s.id === activeSessionId);
      await streamMessage({
        sessionId: activeSessionId,
        content,
        documentId: activeSession?.document_id ?? null,
        onError: (err) => toast.error(err || "Stream failed"),
      });
    },
    [activeSessionId, sessions, appendMessage, streamMessage]
  );

  const activeMessages = activeSessionId ? messagesBySession[activeSessionId] ?? [] : [];
  const activeSession  = sessions.find((s) => s.id === activeSessionId) ?? null;

  return (
    <div className="flex h-screen w-full overflow-hidden flex-col" style={{ background: "#0A0908" }}>
      <div className="flex flex-1 overflow-hidden">
        <ChatSidebar
          onNewChat={handleNewChat}
          onSelectSession={handleSelectSession}
          onDeleteSession={handleDeleteSession}
          documents={documents}
          uploading={uploading}
          uploadProgress={uploadProgress}
          onUploadDocument={uploadDoc}
          onDeleteDocument={removeDoc}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex flex-1 flex-col min-w-0">
          {/* Top bar */}
          <div
            className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-3 sm:py-4"
            style={{ borderBottom: "1px solid rgba(212,168,86,0.06)" }}
          >
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden shrink-0 rounded-lg p-1.5 transition-colors cursor-pointer hover:opacity-80"
              style={{ color: "rgba(180,195,230,0.5)" }}
            >
              <Menu size={18} />
            </button>

            {activeSession ? (
              <>
                <h1 className="truncate text-sm font-semibold" style={{ color: "#E2E8F8" }}>
                  {activeSession.title || "New Chat"}
                </h1>
                {activeSession.document_name && (
                  <span
                    className="hidden sm:inline-block shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium truncate max-w-[160px]"
                    style={{
                      background: "rgba(212,168,86,0.08)",
                      border: "1px solid rgba(212,168,86,0.2)",
                      color: "#D4A856",
                    }}
                  >
                    {activeSession.document_name}
                  </span>
                )}
              </>
            ) : (
              <h1 className="text-sm font-medium" style={{ color: "rgba(180,195,230,0.4)" }}>
                StudyMind AI
              </h1>
            )}
          </div>

          {/* Messages / empty state */}
          {!activeSessionId ? (
            <EmptyState onNewChat={handleNewChat} />
          ) : (
            <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6">
              {activeMessages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}

              {isStreaming && streamingContent && (
                <MessageBubble
                  key="streaming"
                  message={{ role: "assistant", content: "" }}
                  isStreamingMsg
                  streamingContent={streamingContent}
                  streamingSources={streamingSources}
                />
              )}

              {isStreaming && !streamingContent && (
                <div className="flex gap-3">
                  <div
                    className="h-7 w-7 shrink-0 rounded-full"
                    style={{ background: "linear-gradient(135deg, #D4A856, #E8B894)" }}
                  />
                  <div className="flex items-center gap-1 pt-2">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          background: "#D4A856",
                          opacity: 0.6,
                          animation: `blink 1s ease-in-out ${i * 0.2}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Input */}
          {activeSessionId && (
            <div className="px-3 sm:px-6 pb-4 sm:pb-6 pt-2">
              <ChatInput onSend={handleSend} isStreaming={isStreaming} disabled={!activeSessionId} />
              <p className="mt-2 text-center text-[10px]" style={{ color: "rgba(180,195,230,0.2)" }}>
                StudyMind can make mistakes. Verify important information.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <AppFooter />
    </div>
  );
};

export default ChatPage;