import { Route, Routes } from "react-router-dom";

import IndexPage from "@/pages/index";
import AboutPage from "@/pages/about";
import EditPage from "@/pages/edit";

function App() {
  return (
    <Routes>
      <Route element={<IndexPage />} path="/" />
      <Route element={<EditPage />} path="/edit" />
      <Route element={<AboutPage />} path="/about" />
    </Routes>
  );
}

export default App;
