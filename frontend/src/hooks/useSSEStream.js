import { useCallback } from "react";
import axios from "../api/axios";
import useChatStore from "../store/chatStore";
import { useAuthStore } from "../store/authStore";

// Stable module-level selector — never causes re-renders
const getToken = () => useAuthStore.getState().accessToken;

const useSSEStream = () => {
  const setStreaming         = useChatStore((s) => s.setStreaming);
  const appendStreamToken    = useChatStore((s) => s.appendStreamToken);
  const setStreamingSources  = useChatStore((s) => s.setStreamingSources);
  const resetStream          = useChatStore((s) => s.resetStream);
  const finalizeStreamedMessage = useChatStore((s) => s.finalizeStreamedMessage);
  const updateSessionTitle   = useChatStore((s) => s.updateSessionTitle);

  const streamMessage = useCallback(
    async ({ sessionId, content, documentId = null, onError }) => {
      resetStream();
      setStreaming(true);

      // ── Guard: bail immediately if no token ───────────────────────────────
      let token = getToken();
      if (!token) {
        setStreaming(false);
        onError?.("Not authenticated. Please log in again.");
        return;
      }

      const buildHeaders = (t) => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${t}`,
      });

      const body = JSON.stringify({
        content,
        ...(documentId ? { document_id: documentId } : {}),
      });

      // ✅ FIXED: VITE_API_URL (matches your .env), not VITE_API_BASE_URL
      const streamUrl = `${import.meta.env.VITE_API_URL}/api/v1/chat/sessions/${sessionId}/stream`;

      // ── Helper: perform the fetch, returns Response ───────────────────────
      const doFetch = (t) =>
        fetch(streamUrl, {
          method: "POST",
          headers: buildHeaders(t),
          credentials: "include", // send httpOnly refresh cookie
          body,
        });

      try {
        let response = await doFetch(token);

        // ── 401 recovery: try one silent token refresh then retry ─────────
        if (response.status === 401) {
          try {
            const { data } = await axios.post(
              "/auth/refresh",
              {},
              { withCredentials: true },
            );
            const newToken = data.access_token;
            useAuthStore.getState().setAccessToken(newToken);
            token = newToken;
            response = await doFetch(token);
          } catch {
            setStreaming(false);
            onError?.("Session expired. Please log in again.");
            return;
          }
        }

        if (!response.ok) {
          throw new Error(`Stream failed: ${response.status}`);
        }

        // ── SSE reading loop ──────────────────────────────────────────────
        const reader  = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer    = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;

            let event;
            try {
              event = JSON.parse(raw);
            } catch {
              continue;
            }

            if (event.type === "token") {
              appendStreamToken(event.content);
            } else if (event.type === "sources") {
              setStreamingSources(event.content);
            } else if (event.type === "done") {
              finalizeStreamedMessage(sessionId);

              // Non-critical: refresh session title
              try {
                const titleRes = await axios.get("/chat/sessions");
                if (titleRes.data) {
                  const updated = titleRes.data.find((s) => s.id === sessionId);
                  if (updated) updateSessionTitle(sessionId, updated.title);
                }
              } catch {
                // title refresh failure is silent
              }
            }
          }
        }
      } catch (err) {
        resetStream();
        onError?.(err instanceof Error ? err.message : "Streaming failed");
      } finally {
        setStreaming(false);
      }
    },
    [
      setStreaming,
      appendStreamToken,
      setStreamingSources,
      resetStream,
      finalizeStreamedMessage,
      updateSessionTitle,
    ],
  );

  return { streamMessage };
};

export default useSSEStream;