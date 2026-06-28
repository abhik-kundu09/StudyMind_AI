import { create } from "zustand";

const useChatStore = create((set, get) => ({
  // ── Sessions ──────────────────────────────────────────────────────────────
  sessions: [],
  activeSessionId: null,

  setSessions: (sessions) => set({ sessions }),

  addSession: (session) =>
    set((s) => ({ sessions: [session, ...s.sessions] })),

  removeSession: (id) =>
    set((s) => ({
      sessions: s.sessions.filter((sess) => sess.id !== id),
      activeSessionId: s.activeSessionId === id ? null : s.activeSessionId,
    })),

  updateSessionTitle: (id, title) =>
    set((s) => ({
      sessions: s.sessions.map((sess) =>
        sess.id === id ? { ...sess, title } : sess
      ),
    })),

  setActiveSession: (id) => set({ activeSessionId: id }),

  // ── Messages ──────────────────────────────────────────────────────────────
  // keyed by session_id → array of messages
  messagesBySession: {},

  setMessages: (sessionId, messages) =>
    set((s) => ({
      messagesBySession: { ...s.messagesBySession, [sessionId]: messages },
    })),

  appendMessage: (sessionId, message) =>
    set((s) => {
      const existing = s.messagesBySession[sessionId] || [];
      return {
        messagesBySession: {
          ...s.messagesBySession,
          [sessionId]: [...existing, message],
        },
      };
    }),

  // ── Streaming state ───────────────────────────────────────────────────────
  isStreaming: false,
  streamingContent: "",
  streamingSources: [],

  setStreaming: (val) => set({ isStreaming: val }),

  appendStreamToken: (token) =>
    set((s) => ({ streamingContent: s.streamingContent + token })),

  setStreamingSources: (sources) => set({ streamingSources: sources }),

  resetStream: () =>
    set({ streamingContent: "", streamingSources: [], isStreaming: false }),

  // ── Finalize streaming message into messagesBySession ─────────────────────
  finalizeStreamedMessage: (sessionId) => {
    const { streamingContent, streamingSources } = get();
    if (!streamingContent) return;
    const msg = {
      id: `stream-${Date.now()}`,
      session_id: sessionId,
      role: "assistant",
      content: streamingContent,
      sources: streamingSources,
      created_at: new Date().toISOString(),
    };
    get().appendMessage(sessionId, msg);
    get().resetStream();
  },
}));

export default useChatStore;