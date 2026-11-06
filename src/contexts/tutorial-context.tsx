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
import { readPreference, writePreference } from "@/lib/safe-storage";

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
  /** Ends a tour that failed, without recording it as completed or dismissed. */
  abortTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Mirrors of state and location for handlers that can fire several times
  // before React re-renders (rapid clicks, keyboard repeat).
  const stepRef = useRef(0);
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const goToStep = useCallback(
    (index: number) => {
      stepRef.current = index;
      setCurrentStep(index);
      const { route } = TUTORIAL_STEPS[index];
      if (pathnameRef.current !== route) {
        pathnameRef.current = route;
        navigate(route);
      }
    },
    [navigate],
  );

  const startTutorial = useCallback(() => {
    writePreference(STORAGE_KEY, "in-progress");
    setIsActive(true);
    goToStep(0);
  }, [goToStep]);

  const completeTutorial = useCallback(() => {
    setIsActive(false);
    writePreference(STORAGE_KEY, "completed");
  }, []);

  const skipTutorial = useCallback(() => {
    setIsActive(false);
    writePreference(STORAGE_KEY, "dismissed");
  }, []);

  const abortTutorial = useCallback(() => {
    setIsActive(false);
  }, []);

  const nextStep = useCallback(() => {
    const next = stepRef.current + 1;
    if (next >= TUTORIAL_STEPS.length) {
      completeTutorial();
      return;
    }
    goToStep(next);
  }, [completeTutorial, goToStep]);

  const prevStep = useCallback(() => {
    if (stepRef.current > 0) goToStep(stepRef.current - 1);
  }, [goToStep]);

  const followRoute = useCallback((route: string) => {
    pathnameRef.current = route;
    if (TUTORIAL_STEPS[stepRef.current].route === route) return;
    const index = TUTORIAL_STEPS.findIndex((step) => step.route === route);
    if (index >= 0) {
      stepRef.current = index;
      setCurrentStep(index);
    }
  }, []);

  // Keep the step and page in agreement when the route moves under the tour.
  // Keyed on the route alone: starting the tour must not react to a location
  // that is about to change.
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;
  useEffect(() => {
    if (isActiveRef.current) followRoute(pathname);
  }, [pathname, followRoute]);

  // React Router applies location changes in a transition, so Back during a
  // pending navigation can leave `pathname` unchanged. The URL is authoritative.
  useEffect(() => {
    if (!isActive) return;
    const onPopState = () => followRoute(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [isActive, followRoute]);

  // First-visit auto-show
  const startRef = useRef(startTutorial);
  startRef.current = startTutorial;
  useEffect(() => {
    if (readPreference(STORAGE_KEY) !== null) return;
    const timer = setTimeout(() => startRef.current(), 800);
    return () => clearTimeout(timer);
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
        abortTutorial,
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
