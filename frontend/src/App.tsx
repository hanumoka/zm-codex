import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { DashboardPage } from "./pages/DashboardPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { MemoryPage } from "./pages/MemoryPage";
import { WorkflowPage } from "./pages/WorkflowPage";
import { PoliciesPage } from "./pages/PoliciesPage";
import { ChangesPage } from "./pages/ChangesPage";
import { ConfigPage } from "./pages/ConfigPage";
import { WatcherPage } from "./pages/WatcherPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/memory" element={<MemoryPage />} />
          <Route path="/workflows" element={<WorkflowPage />} />
          <Route path="/policies" element={<PoliciesPage />} />
          <Route path="/changes" element={<ChangesPage />} />
          <Route path="/config" element={<ConfigPage />} />
          <Route path="/watcher" element={<WatcherPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
