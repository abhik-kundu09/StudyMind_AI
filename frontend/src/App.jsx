import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";

import Login          from "./pages/Auth/Login";
import Register       from "./pages/Auth/Register";
import Dashboard      from "./pages/Dashboard/index";
import ChatPage       from "./pages/Chat/index";
import StudyPlanPage  from "./pages/StudyPlan/index";
import TermsPage      from "./pages/Legal/Terms";
import LicensePage    from "./pages/Legal/License";
import FlashcardsPage from "./pages/Flashcards/index";

// Page transition variants — dramatic cinematic reveal
const pageVariants = {
  initial: {
    opacity: 0,
    y: 24,
    scale: 0.985,
    filter: "blur(4px)",
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1], // custom cubic-bezier: fast settle, luxury feel
    },
  },
  exit: {
    opacity: 0,
    y: -16,
    scale: 1.005,
    filter: "blur(3px)",
    transition: {
      duration: 0.28,
      ease: [0.55, 0, 1, 0.45],
    },
  },
};

// Wraps every page in the motion.div — must live inside BrowserRouter
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{ minHeight: "100vh" }}
      >
        <Routes location={location}>
          {/* Public */}
          <Route path="/login"         element={<ErrorBoundary><Login /></ErrorBoundary>} />
          <Route path="/register"      element={<ErrorBoundary><Register /></ErrorBoundary>} />
          <Route path="/legal/terms"   element={<ErrorBoundary><TermsPage /></ErrorBoundary>} />
          <Route path="/legal/license" element={<ErrorBoundary><LicensePage /></ErrorBoundary>} />

          {/* Protected */}
          <Route path="/dashboard"
            element={<ProtectedRoute><ErrorBoundary><Dashboard /></ErrorBoundary></ProtectedRoute>}
          />
          <Route path="/chat"
            element={<ProtectedRoute><ErrorBoundary><ChatPage /></ErrorBoundary></ProtectedRoute>}
          />
          <Route path="/study-plan/:planId"
            element={<ProtectedRoute><ErrorBoundary><StudyPlanPage /></ErrorBoundary></ProtectedRoute>}
          />
          <Route path="/flashcards"
            element={<ProtectedRoute><ErrorBoundary><FlashcardsPage /></ErrorBoundary></ProtectedRoute>}
          />

          {/* Default */}
          <Route path="/"  element={<Navigate to="/dashboard" replace />} />
          <Route path="*"  element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "rgba(14,12,10,0.97)",
              border: "1px solid rgba(212,168,86,0.25)",
              color: "#F0E6D2",
              backdropFilter: "blur(16px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,168,86,0.08)",
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: "0.875rem",
              borderLeft: "3px solid #D4A856",
            },
            className: "",
          }}
        />
        <AnimatedRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;