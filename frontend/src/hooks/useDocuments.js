// frontend/src/hooks/useDocuments.js
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  deleteDocument,
  getDocumentStatus,
  listDocuments,
  uploadDocument,
} from "../api/documents";

const POLL_INTERVAL_MS = 3000;

export function useDocuments() {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);

  // ── Fetch full document list ──────────────────────────────────────────────
  const fetchDocuments = useCallback(async () => {
    try {
      const { data } = await listDocuments();
      setDocuments(data.documents ?? []);
      return data.documents ?? [];
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Poll status for any pending/processing docs ───────────────────────────
  const pollPending = useCallback(async (docs) => {
    const pending = docs.filter((d) =>
      ["pending", "processing"].includes(d.status)
    );

    if (pending.length === 0) {
      clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }

    const updates = await Promise.allSettled(
      pending.map((d) => getDocumentStatus(d.id))
    );

    setDocuments((prev) => {
      const next = [...prev];
      updates.forEach((result, i) => {
        if (result.status !== "fulfilled") return;
        const fresh = result.value.data;
        const idx = next.findIndex((d) => d.id === pending[i].id);
        if (idx === -1) return;

        const wasProcessing = ["pending", "processing"].includes(next[idx].status);
        const nowReady = fresh.status === "ready";
        const nowFailed = fresh.status === "failed";

        if (wasProcessing && nowReady) {
          toast.success(`"${next[idx].filename}" is ready.`);
        }
        if (wasProcessing && nowFailed) {
          toast.error(`"${next[idx].filename}" failed to process.`);
        }

        next[idx] = { ...next[idx], ...fresh };
      });
      return next;
    });
  }, []);

  // ── Start polling whenever docs list changes and has pending items ─────────
  useEffect(() => {
    const hasPending = documents.some((d) =>
      ["pending", "processing"].includes(d.status)
    );

    if (hasPending && !pollRef.current) {
      pollRef.current = setInterval(() => {
        pollPending(documents);
      }, POLL_INTERVAL_MS);
    }

    if (!hasPending && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [documents, pollPending]);

  // ── Initial load + cleanup ──────────────────────────────────────────────
  useEffect(() => {
    fetchDocuments();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchDocuments]);

  // ── Upload handler ────────────────────────────────────────────────────────
  const upload = useCallback(async (file) => {
    if (!file || file.type !== "application/pdf") {
      toast.error("Only PDF files are accepted.");
      return null;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File exceeds the 20 MB limit.");
      return null;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // documents.js expects a pre-built FormData
      const formData = new FormData();
      formData.append("file", file);

      // ✅ FIX: axios calls this with a ProgressEvent-like object
      // { loaded, total, progress, bytes, rate, estimated, event, lengthComputable, upload }
      // We extract just the numeric percentage before storing in state.
      const handleProgress = (progressEvent) => {
        if (progressEvent?.total) {
          const pct = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(pct);
        } else if (typeof progressEvent?.progress === "number") {
          // axios v1 also exposes a 0–1 `progress` fraction
          setUploadProgress(Math.round(progressEvent.progress * 100));
        }
      };

      const { data } = await uploadDocument(formData, handleProgress);

      setDocuments((prev) => [data, ...prev]);
      toast.success(`"${file.name}" uploaded — processing…`);
      return data;
    } catch (err) {
      const msg = err?.response?.data?.detail ?? "Upload failed.";
      toast.error(msg);
      return null;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, []);

  // ── Delete handler ────────────────────────────────────────────────────────
  const remove = useCallback(async (docId, filename) => {
    try {
      await deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      toast.success(`"${filename}" deleted.`);
    } catch {
      toast.error("Could not delete document.");
    }
  }, []);

  return {
    documents,
    loading,
    uploading,
    uploadProgress,
    upload,
    remove,
    refetch: fetchDocuments,
  };
}