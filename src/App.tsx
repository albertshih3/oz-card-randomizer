import { Route, Routes } from "react-router-dom";

import IndexPage from "@/pages/index";
import AboutPage from "@/pages/about";
import EditPage from "@/pages/edit";
import Changelog from "@/pages/changelog";
import EditCardPage from "./pages/editcard";

function App() {
  return (
    <Routes>
      <Route element={<IndexPage />} path="/" />
      <Route element={<EditPage />} path="/edit" />
      <Route element={<AboutPage />} path="/about" />
      <Route element={<Changelog />} path="/changelog" />
      <Route element={<EditCardPage />} path="/editcard" />
    </Routes>
  );
}

export default App;
