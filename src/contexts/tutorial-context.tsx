import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { TUTORIAL_STEPS } from "@/components/admin/tutorial/steps";

const STORAGE_KEY = "oz-admin-tutorial-v1";

interface TutorialContextValue {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  startTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const autoShowRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startTutorial = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "in-progress");
    setCurrentStep(0);
    setIsActive(true);
    const firstRoute = TUTORIAL_STEPS[0].route;
    if (location.pathname !== firstRoute) {
      navigate(firstRoute);
    }
  }, [navigate, location.pathname]);

  const completeTutorial = useCallback(() => {
    setIsActive(false);
    localStorage.setItem(STORAGE_KEY, "completed");
  }, []);

  const skipTutorial = useCallback(() => {
    setIsActive(false);
    localStorage.setItem(STORAGE_KEY, "dismissed");
  }, []);

  const nextStep = useCallback(() => {
    const next = currentStep + 1;
    if (next >= TUTORIAL_STEPS.length) {
      completeTutorial();
      return;
    }
    const nextRoute = TUTORIAL_STEPS[next].route;
    if (location.pathname !== nextRoute) {
      navigate(nextRoute);
    }
    setCurrentStep(next);
  }, [completeTutorial, navigate, location.pathname, currentStep]);

  const prevStep = useCallback(() => {
    const next = Math.max(0, currentStep - 1);
    if (next !== currentStep) {
      const prevRoute = TUTORIAL_STEPS[next].route;
      if (location.pathname !== prevRoute) {
        navigate(prevRoute);
      }
    }
    setCurrentStep(next);
  }, [navigate, location.pathname, currentStep]);

  // First-visit auto-show
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      autoShowRef.current = setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, "in-progress");
        setCurrentStep(0);
        setIsActive(true);
      }, 800);
    }
    return () => {
      if (autoShowRef.current) clearTimeout(autoShowRef.current);
    };
  }, []);

  return (
    <TutorialContext.Provider
      value={{
        isActive,
        currentStep,
        totalSteps: TUTORIAL_STEPS.length,
        startTutorial,
        nextStep,
        prevStep,
        skipTutorial,
        completeTutorial,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial(): TutorialContextValue {
  const ctx = useContext(TutorialContext);
  if (!ctx) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return ctx;
}
