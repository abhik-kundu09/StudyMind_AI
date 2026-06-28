import api from "./axios";

export const listDocuments = () =>
  api.get("/documents");

export const uploadDocument = (formData, onProgress) =>
  api.post("/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress,
  });

export const deleteDocument = (documentId) =>
  api.delete(`/documents/${documentId}`);

export const getDocumentStatus = (documentId) =>
  api.get(`/documents/${documentId}/status`);