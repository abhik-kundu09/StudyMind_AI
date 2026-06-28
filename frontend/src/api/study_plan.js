// frontend/src/api/study_plan.js
// Mirrors api/quiz.js convention — raw axios promise, no unwrapping.
// baseURL already includes /api/v1 (see axios.js) — use short paths only.

import api from "./axios";

export const generateStudyPlan = (docIds, examName, examDate, goal, dailyHours = 2) =>
  api.post("/study_plan/generate", {
    doc_ids: docIds,
    exam_name: examName,
    exam_date: examDate,     // ISO-8601 string
    goal,
    daily_hours: dailyHours,
  });

export const getStudyPlanStatus = (planId) =>
  api.get(`/study_plan/${planId}/status`);

export const getStudyPlan = (planId) =>
  api.get(`/study_plan/${planId}`);

export const listStudyPlans = () =>
  api.get("/study_plan/");

export const updateItemStatus = (planId, itemIndex, newStatus) =>
  api.patch(`/study_plan/${planId}/item/${itemIndex}`, { status: newStatus });

export const toggleTask = (planId, itemIndex, taskIndex, done) =>
  api.patch(`/study_plan/${planId}/item/${itemIndex}/task/${taskIndex}`, { done });