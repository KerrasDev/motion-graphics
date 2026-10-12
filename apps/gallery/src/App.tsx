import { Link, Route, Routes } from 'react-router-dom';
import GalleryPage from './pages/GalleryPage';
import EffectDetailPage from './pages/EffectDetailPage';
import DocsPage from './pages/DocsPage';
import ContributingPage from './pages/ContributingPage';
import WorkspacePage from './pages/WorkspacePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<GalleryPage />} />
      <Route path="/effects/:effectId" element={<EffectDetailPage />} />
      <Route path="/docs" element={<DocsPage />} />
      <Route path="/docs/contributing" element={<ContributingPage />} />
      <Route path="/workspaces" element={<WorkspacePage />} />
      <Route path="*" element={(
        <main className="gallery-shell">
          <div className="empty-state">
            <p className="eyebrow">404</p>
            <h1>Page not found</h1>
            <p>This page does not exist in the Motion Graphics gallery.</p>
            <Link to="/" className="primary-button">Return to gallery</Link>
          </div>
        </main>
      )} />
    </Routes>
  );
}
