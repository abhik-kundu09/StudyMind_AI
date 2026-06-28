import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  generateFlashcards,
  getDecks,
  getDueCards,
  submitReview,
  deleteDeck,
} from "../api/flashcards";

export function useFlashcards() {
  const [decks,      setDecks]      = useState([]);
  const [dueCards,   setDueCards]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error,      setError]      = useState(null);

  const fetchDecks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await getDecks();
      setDecks(data.decks || []);
    } catch (e) {
      const msg = e.response?.data?.detail || "Failed to load decks";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const startSession = useCallback(async (docId = null) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await getDueCards(docId);
      setDueCards(data.cards || []);
      return data.cards || [];
    } catch (e) {
      const msg = e.response?.data?.detail || "Failed to load cards";
      setError(msg);
      toast.error(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const generate = useCallback(async (docId) => {
    setGenerating(true);
    setError(null);
    try {
      const { data } = await generateFlashcards(docId);
      toast.success(`Deck generated — ${data.count} cards ready`);
      return data;
    } catch (e) {
      const msg = e.response?.data?.detail || "Generation failed";
      setError(msg);
      toast.error(`Failed to generate deck`);
      throw e;
    } finally {
      setGenerating(false);
    }
  }, []);

  const review = useCallback(async (cardId, quality) => {
    try {
      const { data } = await submitReview(cardId, quality);
      setDueCards((prev) => prev.filter((c) => c._id !== cardId));
      return data.card;
    } catch (e) {
      const msg = e.response?.data?.detail || "Review submission failed";
      setError(msg);
      toast.error("Failed to submit review");
      throw e;
    }
  }, []);

  const removeDeck = useCallback(async (docId) => {
    try {
      await deleteDeck(docId);
      setDecks((prev) => prev.filter((d) => d.doc_id !== docId));
      toast.success("Deck deleted");
    } catch (e) {
      const msg = e.response?.data?.detail || "Delete failed";
      setError(msg);
      toast.error("Failed to delete deck");
    }
  }, []);

  return {
    decks, dueCards, loading, generating, error,
    fetchDecks, startSession, generate, review, removeDeck,
  };
}