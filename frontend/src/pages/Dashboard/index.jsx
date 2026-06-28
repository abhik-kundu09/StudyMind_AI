import { useState } from "react";
import { LogOut } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore } from "../../store/authStore";
import { useAuth } from "../../contexts/AuthContext";
import { useDocuments } from "../../hooks/useDocuments";
import { useQuiz } from "../../hooks/useQuiz";
import { useQuizStats } from "../../hooks/useQuizStats";
import { useStudyPlan, useStudyPlanList } from "../../hooks/useStudyPlan";
import { useProgress } from "../../hooks/useProgress";

import Scoreboards         from "../../components/dashboard/Scoreboards";
import DocumentHub         from "../../components/dashboard/DocumentHub";
import StudyPlanHistory    from "../../components/dashboard/StudyPlanHistory";
import ActivityBanner      from "../../components/dashboard/ActivityBanner";
import QuickActions        from "../../components/dashboard/QuickActions";
import QuizGenerateModal   from "../../components/dashboard/QuizGenerateModal";
import TakeQuiz            from "../Quiz/TakeQuiz";
import StudyPlanWizard     from "../../components/dashboard/StudyPlanWizard";
import AppFooter           from "../../components/AppFooter";
import ScoreboardSkeleton  from "../../components/ui/skeletons/ScoreboardSkeleton";
import DocumentHubSkeleton from "../../components/ui/skeletons/DocumentHubSkeleton";

const colVariants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export default function Dashboard() {
  const { user }   = useAuthStore();
  const { logout } = useAuth();

  const docsState      = useDocuments();
  const quizState      = useQuiz();
  const stats          = useQuizStats();
  const studyPlanState = useStudyPlan();
  const { plans, loading: plansLoading, refresh: refreshPlans } = useStudyPlanList();
  const { summary: progressSummary, loading: progressLoading }  = useProgress();

  const [modalOpen,           setModalOpen]           = useState(false);
  const [takingQuiz,          setTakingQuiz]          = useState(false);
  const [preselectedDocId,    setPreselectedDocId]    = useState(null);
  const [studyPlanWizardOpen, setStudyPlanWizardOpen] = useState(false);

  const openGenerateModal = (docId = null) => {
    quizState.reset();
    setPreselectedDocId(docId);
    setModalOpen(true);
  };

  const handleQuizReady = () => { setModalOpen(false); setTakingQuiz(true); };
  const closeTakeQuiz   = () => { setTakingQuiz(false); quizState.reset(); stats.refetch(); };
  const handleRetake    = () => { setTakingQuiz(false); openGenerateModal(); };

  const closeStudyPlanWizard = () => {
    setStudyPlanWizardOpen(false);
    refreshPlans();
  };

  return (
    <div className="min-h-screen w-full flex flex-col" style={{ background: "#0A0908" }}>

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center justify-between px-4 sm:px-6 py-4"
        style={{ borderBottom: "1px solid rgba(212,168,86,0.08)" }}
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: "#F0E6D2" }}>
            Welcome back, {user?.name ?? "there"}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(180,195,230,0.4)" }}>
            Here's your study overview
          </p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all cursor-pointer hover:opacity-80"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(212,168,86,0.15)",
            color: "rgba(180,195,230,0.6)",
          }}
        >
          <LogOut size={13} />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </motion.div>

      {/* ── Main content ────────────────────────────────────────────── */}
      {takingQuiz ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-2xl px-4 sm:px-6 py-8 w-full"
        >
          <TakeQuiz quizState={quizState} onClose={closeTakeQuiz} onRetake={handleRetake} />
        </motion.div>
      ) : (
        <div className="flex-1 px-4 py-6 sm:px-6 sm:py-8 flex flex-col gap-6">

          {/*
            Layout:
            ┌─────────────┬─────────────┬──────────────────┐
            │ Scoreboards │ DocumentHub │  Quick Actions   │  ← row 1
            ├─────────────┴─────────────┤  (spans 2 rows)  │
            │   Study Plan History      │                  │  ← row 2
            └───────────────────────────┴──────────────────┘
            Row 3: Activity Banner (full width)

            On lg: explicit CSS grid with named areas.
            On mobile/tablet: single column stacked naturally.
          */}

          {/* ── lg: CSS grid with row-span; mobile: flex-col ── */}
          <div className="hidden lg:grid gap-6" style={{
            gridTemplateColumns: "1fr 1fr 1fr",
            gridTemplateRows: "auto auto",
            gridTemplateAreas: `
              "scores  dochub  quickactions"
              "history history quickactions"
            `,
          }}>
            {/* Scoreboards */}
            <motion.div
              variants={colVariants} initial="hidden" animate="visible"
              style={{ gridArea: "scores" }}
            >
              {stats.loading ? <ScoreboardSkeleton /> : <Scoreboards stats={stats} planCount={plans.length} />}
            </motion.div>

            {/* Document Hub */}
            <motion.div
              variants={colVariants} initial="hidden" animate="visible"
              transition={{ delay: 0.07 }}
              style={{ gridArea: "dochub" }}
            >
              {docsState.loading ? <DocumentHubSkeleton /> : <DocumentHub docsState={docsState} onGenerateQuiz={openGenerateModal} />}
            </motion.div>

            {/* Quick Actions — spans both rows */}
            <motion.div
              variants={colVariants} initial="hidden" animate="visible"
              transition={{ delay: 0.14 }}
              style={{ gridArea: "quickactions" }}
            >
              <div className="sticky top-24 rounded-2xl p-5" style={{
                background: "rgba(20,17,12,0.7)",
                border: "1px solid rgba(212,168,86,0.15)",
                backdropFilter: "blur(12px)",
              }}>
                <QuickActions
                  onGenerateQuiz={openGenerateModal}
                  onOpenStudyPlan={() => setStudyPlanWizardOpen(true)}
                />
              </div>
            </motion.div>

            {/* Study Plan History */}
            <motion.div
              variants={colVariants} initial="hidden" animate="visible"
              transition={{ delay: 0.21 }}
              style={{ gridArea: "history" }}
            >
              <StudyPlanHistory
                onNewPlan={() => setStudyPlanWizardOpen(true)}
                plans={plans}
                loading={plansLoading}
              />
            </motion.div>
          </div>

          {/* ── Mobile/tablet: stacked single column ── */}
          <div className="flex flex-col gap-6 lg:hidden">
            <motion.div variants={colVariants} initial="hidden" animate="visible">
              {stats.loading ? <ScoreboardSkeleton /> : <Scoreboards stats={stats} planCount={plans.length} />}
            </motion.div>
            <motion.div variants={colVariants} initial="hidden" animate="visible" transition={{ delay: 0.07 }}>
              {docsState.loading ? <DocumentHubSkeleton /> : <DocumentHub docsState={docsState} onGenerateQuiz={openGenerateModal} />}
            </motion.div>
            <motion.div variants={colVariants} initial="hidden" animate="visible" transition={{ delay: 0.14 }}>
              <div className="rounded-2xl p-5" style={{ background: "rgba(20,17,12,0.7)", border: "1px solid rgba(212,168,86,0.15)" }}>
                <QuickActions
                  onGenerateQuiz={openGenerateModal}
                  onOpenStudyPlan={() => setStudyPlanWizardOpen(true)}
                />
              </div>
            </motion.div>
            <motion.div variants={colVariants} initial="hidden" animate="visible" transition={{ delay: 0.21 }}>
              <StudyPlanHistory
                onNewPlan={() => setStudyPlanWizardOpen(true)}
                plans={plans}
                loading={plansLoading}
              />
            </motion.div>
          </div>

          {/* ── Row 3: Activity Banner (full width) ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <ActivityBanner summary={progressSummary} loading={progressLoading} />
          </motion.div>

        </div>
      )}

      <AppFooter />

      {/* ── Modals ────────────────────────────────────────────────── */}
      <QuizGenerateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        documents={docsState.documents}
        quizState={quizState}
        onReady={handleQuizReady}
        preselectedDocId={preselectedDocId}
      />
      <StudyPlanWizard
        open={studyPlanWizardOpen}
        onClose={closeStudyPlanWizard}
        docs={docsState.documents}
        studyPlanState={studyPlanState}
      />
    </div>
  );
}