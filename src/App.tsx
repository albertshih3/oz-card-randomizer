import { Navigate, Route, Routes } from "react-router-dom";
import React, { Suspense, useEffect } from "react";
import { Toaster, toast } from "sonner";

import IndexPage from "@/pages/index";
import AboutPage from "@/pages/about";
import Changelog from "@/pages/changelog";
import { M3Spinner } from "@/components/m3/spinner";
import { ErrorBoundary } from "@/components/error-boundary";
import { usePageView } from "@/hooks/use-page-view";

const AdminLayout = React.lazy(() => import("@/layouts/admin"));
const AdminCardsPage = React.lazy(() => import("@/pages/admin/index"));
const AdminUsersPage = React.lazy(() => import("@/pages/admin/users"));
const AdminAnalyticsPage = React.lazy(() => import("@/pages/admin/analytics"));
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
            <Route element={<AboutPage />} path="/about" />
            <Route element={<Changelog />} path="/changelog" />
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminCardsPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
            </Route>
            <Route path="/edit" element={<Navigate to="/admin" replace />} />
            <Route
              path="/editcard"
              element={<Navigate to="/admin" replace />}
            />
            <Route
              path="/categories"
              element={<Navigate to="/admin" replace />}
            />
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
