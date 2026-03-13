import { Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import { Toaster, toast } from "sonner";

import IndexPage from "@/pages/index";
import AboutPage from "@/pages/about";
import EditPage from "@/pages/edit";
import Changelog from "@/pages/changelog";
import EditCardPage from "./pages/editcard";
import CategoriesPage from "./pages/categories";
import { usePageView } from "@/hooks/use-analytics";

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
      <Routes>
        <Route element={<IndexPage />} path="/" />
        <Route element={<EditPage />} path="/edit" />
        <Route element={<AboutPage />} path="/about" />
        <Route element={<Changelog />} path="/changelog" />
        <Route element={<EditCardPage />} path="/editcard" />
        <Route element={<CategoriesPage />} path="/categories" />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
