import api from "./axios";

// ── Sessions ──────────────────────────────────────────────────────────────

export const createSession = (documentId = null, documentName = null) =>
  api.post("/chat/sessions", {
    document_id: documentId,
    document_name: documentName,
  });

export const listSessions = () =>
  api.get("/chat/sessions");

export const deleteSession = (sessionId) =>
  api.delete(`/chat/sessions/${sessionId}`);

export const updateSessionTitle = (sessionId, title) =>
  api.patch(`/chat/sessions/${sessionId}/title`, { title });

// ── Messages ──────────────────────────────────────────────────────────────

export const getMessages = (sessionId) =>
  api.get(`/chat/sessions/${sessionId}/messages`);