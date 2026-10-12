import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { EffectMetadata } from '@motion-graphics/core';
import { catalogApi } from '../features/catalog/catalog.api';

export default function GalleryPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [tag, setTag] = useState('all');
  const [sort, setSort] = useState<'name' | 'category'>('name');
  const [effects, setEffects] = useState<EffectMetadata[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const startCatalogRequest = () => {
    setLoading(true);
    setError(null);
  };

  useEffect(() => {
    let active = true;
    Promise.all([catalogApi.listCategories(), catalogApi.listTags()])
      .then(([loadedCategories, loadedTags]) => {
        if (!active) return;
        setCategories(loadedCategories);
        setTags(loadedTags);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load effect filters.');
      });
    return () => { active = false; };
  }, [retryCount]);

  useEffect(() => {
    let active = true;
    catalogApi.listEffects({
      q: search,
      category,
      tags: tag === 'all' ? [] : [tag],
      sort,
    }).then((result) => {
      if (active) setEffects(result);
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load the effect catalog.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [category, retryCount, search, sort, tag]);

  const categoryOptions = useMemo(() => ['all', ...categories], [categories]);

  return (
    <main className="gallery-shell">
      <header className="topbar">
        <div className="brand-block">
          <p className="eyebrow">Open-source motion registry</p>
          <h1>Motion Graphics</h1>
          <p className="intro-copy">Discover, preview, and integrate reusable effects for Remotion projects.</p>
        </div>
        <nav className="site-nav" aria-label="Main navigation">
          <Link to="/workspaces">Create workspace</Link>
          <Link to="/docs">Documentation</Link>
          <Link to="/docs/contributing">Contributing</Link>
        </nav>
      </header>

      <section className="catalog-controls" aria-label="Effect catalog controls">
        <label className="search-control">
          <span>Search effects</span>
          <input
            className="control"
            value={search}
            onChange={(event) => {
              startCatalogRequest();
              setSearch(event.target.value);
            }}
            placeholder="Search names, descriptions, categories, or tags"
          />
        </label>
        <label>
          Category
          <select className="control" value={category} onChange={(event) => {
            startCatalogRequest();
            setCategory(event.target.value);
          }}>
            {categoryOptions.map((option) => <option key={option} value={option}>{option === 'all' ? 'All categories' : option}</option>)}
          </select>
        </label>
        <label>
          Tag
          <select className="control" value={tag} onChange={(event) => {
            startCatalogRequest();
            setTag(event.target.value);
          }}>
            <option value="all">All tags</option>
            {tags.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label>
          Sort
          <select className="control" value={sort} onChange={(event) => {
            startCatalogRequest();
            setSort(event.target.value as 'name' | 'category');
          }}>
            <option value="name">Name</option>
            <option value="category">Category</option>
          </select>
        </label>
      </section>

      <p className="result-count" aria-live="polite">
        {loading ? 'Loading effects…' : `${effects.length} ${effects.length === 1 ? 'effect' : 'effects'}`}
      </p>

      {error ? (
        <div className="empty-state error-state" role="alert">
          <h2>Could not load the effect catalog</h2>
          <p>{error}</p>
          <button type="button" className="secondary-button" onClick={() => {
            startCatalogRequest();
            setRetryCount((count) => count + 1);
          }}>Retry</button>
        </div>
      ) : loading ? (
        <div className="empty-state" role="status">Loading effect catalog…</div>
      ) : effects.length === 0 ? (
        <div className="empty-state">
          <h2>No matching effects</h2>
          <p>Try a different search or clear the selected filters.</p>
          <button type="button" className="secondary-button" onClick={() => {
            startCatalogRequest();
            setSearch('');
            setCategory('all');
            setTag('all');
          }}>Clear filters</button>
        </div>
      ) : (
        <div className="grid">
          {effects.map((effect) => (
            <article key={effect.id} className="card">
              <div className="card-preview" aria-label={`${effect.name} preview`}>
                <div className="preview-placeholder">
                  <span className="preview-placeholder-category">{effect.category}</span>
                  <strong>{effect.name}</strong>
                  <span>Open details to preview and customize</span>
                </div>
              </div>
              <div className="card-body">
                <div className="card-heading">
                  <h2>{effect.name}</h2>
                  <span className="category-label">{effect.category}</span>
                </div>
                <p>{effect.description}</p>
                <div className="badges">
                  {effect.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="badge">{tag}</span>
                  ))}
                </div>
                <Link to={`/effects/${effect.id}`} className="primary-button card-link">View details</Link>
              </div>
            </article>
          ))}
        </div>
      )}
      <footer className="site-footer">
        <p>Built for reusable, inspectable Remotion effects.</p>
        <Link to="/docs/contributing">Learn how to contribute</Link>
      </footer>
    </main>
  );
}
