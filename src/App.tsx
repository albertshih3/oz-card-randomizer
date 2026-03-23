import { Navigate, Route, Routes } from "react-router-dom";
import React, { Suspense, useEffect } from "react";
import { Toaster, toast } from "sonner";

import IndexPage from "@/pages/index";
import AboutPage from "@/pages/about";
import Changelog from "@/pages/changelog";
import { M3Spinner } from "@/components/m3/spinner";
import { ErrorBoundary } from "@/components/error-boundary";
import { usePageView } from "@/hooks/use-analytics";

const EditPage = React.lazy(() => import("@/pages/edit"));
const EditCardPage = React.lazy(() => import("@/pages/editcard"));
const CategoriesPage = React.lazy(() => import("@/pages/categories"));
const NotFoundPage = React.lazy(() => import("@/pages/not-found"));
const SignInPage = React.lazy(() => import("@/pages/sign-in"));

const SuspenseFallback = (
  <div className="flex justify-center items-center h-screen">
    <M3Spinner size="lg" />
  </div>
);

function App() {
  usePageView();

  useEffect(() => {
    const hasSeenAnalyticsNotice = localStorage.getItem(
      "hasSeenAnalyticsNotice",
    );

    if (!hasSeenAnalyticsNotice) {
      const timer = setTimeout(() => {
        toast.info(
          "Analytics tracking is enabled to help understand usage patterns. No personal data is collected.",
          {
            duration: 6000,
            position: "bottom-center",
          },
        );
        localStorage.setItem("hasSeenAnalyticsNotice", "true");
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <>
      <ErrorBoundary>
        <Suspense fallback={SuspenseFallback}>
          <Routes>
            <Route element={<IndexPage />} path="/" />
            <Route element={<EditPage />} path="/edit" />
            <Route element={<AboutPage />} path="/about" />
            <Route element={<Changelog />} path="/changelog" />
            <Route element={<EditCardPage />} path="/editcard" />
            <Route element={<CategoriesPage />} path="/categories" />
            <Route path="/admin" element={<Navigate to="/edit" replace />} />
            <Route path="/sign-in" element={<SignInPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <Toaster />
    </>
  );
}

export default App;
