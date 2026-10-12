import { Link } from 'react-router-dom';

const contributionSteps = [
  'Create a directory under packages/effects/<effect-id>.',
  'Add effect.json, index.tsx, preview.tsx, and a README.md.',
  'Declare properties, runtime dependencies, compatibility, and license in the manifest.',
  'Keep the effect self-contained; do not import gallery or backend internals.',
  'Run pnpm validate:effects and pnpm registry:build.',
  'Run pnpm typecheck, pnpm lint, pnpm test, and pnpm build before opening a pull request.',
];

export default function ContributingPage() {
  return (
    <main className="gallery-shell docs-page">
      <nav className="detail-header" aria-label="Documentation navigation">
        <Link to="/" className="secondary-button">← Gallery</Link>
        <Link to="/docs">Documentation</Link>
      </nav>
      <p className="eyebrow">Contributors</p>
      <h1>Add an effect</h1>
      <p>Effects are discovered from their manifests and included in the generated catalog. Gallery code does not need a manual effect registration.</p>
      <section className="meta-card">
        <h2>Contribution workflow</h2>
        <ol className="docs-list">
          {contributionSteps.map((step) => <li key={step}>{step}</li>)}
        </ol>
      </section>
      <section className="meta-card">
        <h2>Effect contract</h2>
        <p>Use the existing schema in <code>packages/core</code> and keep entry and preview paths within the effect package. The metadata validator checks these files before the registry is generated.</p>
        <p>Preview modules must be included in the trusted local preview registry before the gallery executes them.</p>
      </section>
    </main>
  );
}
