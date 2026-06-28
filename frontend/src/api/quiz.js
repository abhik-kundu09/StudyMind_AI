import api from "./axios";

export const generateQuiz = (docId, questionCount = 10, difficulty = "medium") =>
  api.post("/quiz/generate", {
    doc_id: docId,
    question_count: questionCount,
    difficulty,
  });

export const getQuizStatus = (quizId) =>
  api.get(`/quiz/${quizId}/status`);

export const getQuiz = (quizId) =>
  api.get(`/quiz/${quizId}`);

export const submitQuiz = (quizId, answers, timeTakenSeconds = null) =>
  api.post(`/quiz/${quizId}/submit`, {
    answers,
    time_taken_seconds: timeTakenSeconds,
  });

export const listQuizzes = () =>
  api.get("/quiz/");

export const getQuizHistory = (limit = 20) =>
  api.get("/quiz/history", { params: { limit } });