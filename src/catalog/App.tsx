import { Route, Routes } from "react-router";

// The module the shell mounts at /catalog/* (exposed as ./App). Routes are relative to that
// mount. The screens of HU-CAT-003 (subjects, sections and seats), HU-CAT-001/002 (admin) and
// HU-WEB-002 (professor) are added on top of this file.
export function App() {
  return (
    <section aria-labelledby="catalog-title">
      <h2 id="catalog-title">Catalog</h2>
      <Routes>
        <Route index element={<p>Subjects, sections and seats load here.</p>} />
      </Routes>
    </section>
  );
}

export default App;
