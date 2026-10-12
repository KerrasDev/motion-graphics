import { Link } from 'react-router-dom';

export default function DocsPage() {
  return (
    <main className="gallery-shell docs-page">
      <nav className="detail-header" aria-label="Documentation navigation">
        <Link to="/" className="secondary-button">← Gallery</Link>
        <Link to="/docs/contributing">Contributing</Link>
      </nav>
      <p className="eyebrow">Documentation</p>
      <h1>Getting started</h1>
      <p>Motion Graphics is a local-first catalog of reusable React and Remotion effects.</p>

      <section className="meta-card">
        <h2>Browse and integrate effects</h2>
        <ol className="docs-list">
          <li>Choose an effect from the gallery and inspect its supported properties.</li>
          <li>Install or link the package in your Remotion project.</li>
          <li>Render the component inside a Remotion composition and set its documented props.</li>
          <li>Review the effect's license and compatibility requirements before publishing.</li>
        </ol>
        <p>The gallery integration snippet is generated from the effect manifest and current property values.</p>
      </section>

      <section className="meta-card">
        <h2>Preview compatibility</h2>
        <p>Previews run in the browser using the local Remotion Player. Playback is illustrative; the effect documentation and manifest remain the source for supported settings.</p>
        <p>Effect catalog browsing does not require the API server.</p>
      </section>

      <section className="meta-card">
        <h2>Licensing and troubleshooting</h2>
        <p>Each effect declares its license and runtime dependencies in its metadata. Check the effect README and compatibility fields if it behaves differently in your project.</p>
        <p>If a preview is unavailable, the effect can still be inspected and integrated using its source and metadata.</p>
      </section>
    </main>
  );
}
