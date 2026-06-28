import axios from "./axios";

export const generateFlashcards = (docId) =>
  axios.post(`/flashcards/generate/${docId}`);

export const getDecks = () =>
  axios.get("/flashcards/decks");

export const getDueCards = (docId = null) =>
  axios.get("/flashcards/due", { params: docId ? { doc_id: docId } : {} });

export const submitReview = (cardId, quality) =>
  axios.post(`/flashcards/review/${cardId}`, { quality });

export const deleteDeck = (docId) =>
  axios.delete(`/flashcards/deck/${docId}`);