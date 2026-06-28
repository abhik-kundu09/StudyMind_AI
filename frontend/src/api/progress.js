import api from "./axios";

export const getProgressSummary = () => api.get("/progress/summary");