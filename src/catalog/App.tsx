import { Route, Routes } from "react-router";
import { NewSectionPage } from "./pages/admin/NewSectionPage";
import { NewSubjectPage } from "./pages/admin/NewSubjectPage";
import { MySectionsPage } from "./pages/professor/MySectionsPage";
import { SubjectPage } from "./pages/SubjectPage";
import { SubjectsPage } from "./pages/SubjectsPage";

// The module the shell mounts at /catalog/* (exposed as ./App). Routes are relative to that
// mount: the subjects list (HU-CAT-003) and one subject with its sections. The admin forms
// (HU-CAT-001/002) and the professor's sections (HU-WEB-002) are added on top of this file.
export function App() {
  return (
    <section aria-labelledby="catalog-title">
      <h2 id="catalog-title">Catalog</h2>
      <Routes>
        <Route index element={<SubjectsPage />} />
        <Route path="admin/subjects/new" element={<NewSubjectPage />} />
        <Route path="admin/sections/new" element={<NewSectionPage />} />
        <Route path="professor/sections" element={<MySectionsPage />} />
        <Route path=":code" element={<SubjectPage />} />
      </Routes>
    </section>
  );
}

export default App;
