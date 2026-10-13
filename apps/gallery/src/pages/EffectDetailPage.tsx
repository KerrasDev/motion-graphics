import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Player } from '@remotion/player';
import type { EffectMetadata } from '@motion-graphics/core';
import CodeBlock from '../components/CodeBlock';
import CopyEffectButton from '../components/CopyEffectButton';
import PreviewErrorBoundary from '../components/PreviewErrorBoundary';
import { getEffectConfigurationError, getEffectPropertyError, parseEffectConfiguration } from '../features/catalog/effect-configuration';
import { catalogApi, getDefaultProperties } from '../features/catalog/catalog.api';
import { effectPreviewMap, loadEffectSource } from '../registry/effects';

type PropertyValues = Record<string, unknown>;

function EffectPreviewScene({ effectId, properties }: { effectId: string; properties: PropertyValues }) {
  return effectPreviewMap[effectId]?.(properties) ?? null;
}

function jsxValue(value: unknown): string {
  return `{${JSON.stringify(value)}}`;
}

export default function EffectDetailPage() {
  const { effectId = '' } = useParams();
  const [effect, setEffect] = useState<EffectMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [properties, setProperties] = useState<PropertyValues>({});
  const [configurationJson, setConfigurationJson] = useState('{}');
  const [configurationJsonError, setConfigurationJsonError] = useState('');
  const [jsonEditorOpen, setJsonEditorOpen] = useState(false);
  const [arrayInputErrors, setArrayInputErrors] = useState<Record<string, string>>({});
  const [arrayInputs, setArrayInputs] = useState<Record<string, string>>({});
  const [source, setSource] = useState<{
    effectId: string;
    code: string;
  } | null>(null);
  const [sourceError, setSourceError] = useState<{
    effectId: string;
    message: string;
  } | null>(null);
  const [sourceLoading, setSourceLoading] = useState(false);
  const configurationError = effect ? configurationJsonError || getEffectConfigurationError(effect, properties) || Object.values(arrayInputErrors)[0] || '' : '';

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    catalogApi
      .getEffect(effectId)
      .then((loadedEffect) => {
        if (!active) return;
        setEffect(loadedEffect);
        const defaults = loadedEffect ? getDefaultProperties(loadedEffect) : {};
        setProperties(defaults);
        setConfigurationJson(JSON.stringify(defaults, null, 2));
        setConfigurationJsonError('');
        setJsonEditorOpen(false);
        setArrayInputErrors({});
        setArrayInputs(
          loadedEffect
            ? Object.fromEntries(
                loadedEffect.properties
                  .filter((property) => property.type === 'array' && property.defaultValue !== undefined)
                  .map((property) => [property.name, JSON.stringify(property.defaultValue, null, 2)]),
              )
            : {},
        );
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : 'Unable to load this effect.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [effectId]);

  const integrationCode = useMemo(() => {
    if (!effect) return '';
    if (!effect.exportName || configurationError) return '';
    const props = effect.properties.flatMap((property) => {
      const value = properties[property.name];
      return value === undefined || value === '' ? [] : [`  ${property.name}=${jsxValue(value)}`];
    });
    const attributes = props.length > 0 ? `\n${props.join('\n')}\n` : '';

    return `import { ${effect.exportName} } from '@motion-graphics/effects';\n\n// Render inside a Remotion composition.\n<${effect.exportName}${attributes}/>`;
  }, [configurationError, effect, properties]);

  const aiInstructions = useMemo(() => {
    if (!effect) return '';
    const exportName = effect.exportName;

    const requiredProperties = effect.properties.filter((property) => property.required).map((property) => property.name);
    return [
      `Integrate the ${effect.name} effect into my existing Remotion project.`,
      '',
      `Import ${exportName} from @motion-graphics/effects.`,
      `The effect license is ${effect.license}; preserve its terms when using or redistributing it.`,
      `Compatibility: React ${effect.compatibility.react}; Remotion ${effect.compatibility.remotion}.`,
      `Runtime dependencies: ${effect.dependencies.length ? effect.dependencies.join(', ') : 'none declared'}.`,
      `Required properties: ${requiredProperties.length ? requiredProperties.join(', ') : 'none'}.`,
      `Use the effect's documented properties and defaults, and render it inside a Remotion composition.`,
    ].join('\n');
  }, [effect]);

  const showSource = async () => {
    if (!effect) return;
    setSourceLoading(true);
    setSourceError(null);
    try {
      const code = await loadEffectSource(effect.id);
      if (code === null) {
        throw new Error('No bundled source is available for this effect.');
      }
      setSource({ effectId: effect.id, code });
    } catch (error) {
      setSourceError({
        effectId: effect.id,
        message: error instanceof Error ? error.message : 'Unable to load effect source.',
      });
    } finally {
      setSourceLoading(false);
    }
  };

  const setProperty = (name: string, value: unknown) => {
    setProperties((current) => {
      const next = { ...current, [name]: value };
      if (!configurationJsonError) setConfigurationJson(JSON.stringify(next, null, 2));
      return next;
    });
    setArrayInputErrors((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const resetConfiguration = () => {
    if (!effect) return;
    const defaults = getDefaultProperties(effect);
    setProperties(defaults);
    setConfigurationJson(JSON.stringify(defaults, null, 2));
    setConfigurationJsonError('');
    setArrayInputErrors({});
    setArrayInputs(
      Object.fromEntries(
        effect.properties.filter((property) => property.type === 'array' && property.defaultValue !== undefined).map((property) => [property.name, JSON.stringify(property.defaultValue, null, 2)]),
      ),
    );
  };

  const editConfigurationJson = (json: string) => {
    if (!effect) return;
    setConfigurationJson(json);
    const result = parseEffectConfiguration(effect, json);
    if (!result.success) {
      setConfigurationJsonError(result.error);
      return;
    }

    setProperties(result.configuration);
    setConfigurationJsonError('');
    setArrayInputErrors({});
    setArrayInputs(
      Object.fromEntries(
        effect.properties
          .filter((property) => property.type === 'array' && result.configuration[property.name] !== undefined)
          .map((property) => [property.name, JSON.stringify(result.configuration[property.name], null, 2)]),
      ),
    );
  };

  if (loading) {
    return (
      <main className='gallery-shell'>
        <p role='status'>Loading effect…</p>
      </main>
    );
  }

  if (loadError || !effect) {
    return (
      <main className='gallery-shell detail-page'>
        <Link to='/' className='secondary-button'>
          Back to gallery
        </Link>
        <div className='empty-state error-state' role={loadError ? 'alert' : 'status'}>
          <h1>{loadError ? 'Could not load effect' : 'Effect not found'}</h1>
          <p>{loadError ?? `No effect exists with identifier “${effectId}”.`}</p>
        </div>
      </main>
    );
  }

  const previewAvailable = Boolean(effectPreviewMap[effect.id]);
  const exportName = effect.exportName;

  return (
    <main className='gallery-shell detail-page'>
      <div className='detail-header'>
        <Link to='/' className='secondary-button'>
          ← Back to gallery
        </Link>
        <span className='category-label'>{effect.category}</span>
      </div>

      <header className='effect-heading'>
        <p className='eyebrow'>Effect · v{effect.version}</p>
        <h1>{effect.name}</h1>
        <p>{effect.description}</p>
        <CopyEffectButton effect={effect} />
        <div className='badges'>
          {effect.tags.map((tag) => (
            <span key={tag} className='badge'>
              {tag}
            </span>
          ))}
        </div>
      </header>

      <div className='detail-layout'>
        <div className='detail-main'>
          <section className='preview-pane' aria-labelledby='preview-title'>
            <div className='section-heading'>
              <h2 id='preview-title'>Preview</h2>
            </div>
            <div className='preview-shell'>
              {previewAvailable ? (
                <PreviewErrorBoundary key={effect.id}>
                  <Player
                    component={EffectPreviewScene}
                    inputProps={{ effectId: effect.id, properties }}
                    durationInFrames={90}
                    fps={30}
                    compositionWidth={1280}
                    compositionHeight={720}
                    controls
                    loop
                    style={{ width: '100%', maxWidth: 900 }}
                  />
                </PreviewErrorBoundary>
              ) : (
                <p role='status'>No local preview is available for this effect.</p>
              )}
            </div>
          </section>

          <section className='meta-card documentation-card'>
            <h2>About this effect</h2>
            <p>{effect.description}</p>
            <p>
              Source:{' '}
              <code>
                packages/effects/{effect.id}/{effect.entry.replace(/^\.\//, '')}
              </code>
            </p>
            {effect.documentationUrl && (
              <p>
                <a href={effect.documentationUrl} target='_blank' rel='noreferrer'>
                  Documentation and framework reference
                </a>
              </p>
            )}
          </section>

          <section className='meta-card source-card'>
            <h2>Original library source</h2>
            <p>This is the original package file. Copy Effect provides a separate, standalone export for your Remotion project.</p>
            {source?.effectId === effect.id ? (
              <CodeBlock code={source.code} copyButtonLabel='Copy source' />
            ) : (
              <button type='button' className='secondary-button' onClick={() => void showSource()} disabled={sourceLoading}>
                {sourceLoading ? 'Loading source…' : 'View source code'}
              </button>
            )}
            {sourceError?.effectId === effect.id && <p role='alert'>{sourceError.message}</p>}
          </section>

          <section className='meta-card integration-card'>
            <h2>Remotion usage example</h2>
            {integrationCode ? (
              <>
                <p>Use this invocation inside a Remotion composition. It reflects the valid configuration below.</p>
                <CodeBlock code={integrationCode} copyButtonLabel='Copy invocation' />
              </>
            ) : (
              <p role='status'>
                {exportName ? 'Fill required properties and correct any invalid values to generate the integration example.' : 'A verified package export is not registered for this effect yet.'}
              </p>
            )}
          </section>

          {aiInstructions && (
            <section className='meta-card integration-card'>
              <h2>AI integration instructions</h2>
              <p>Copy these instructions into your coding assistant to integrate this effect with its declared requirements.</p>
              <CodeBlock code={aiInstructions} copyButtonLabel='Copy AI Instructions' />
            </section>
          )}
        </div>

        <aside className='detail-sidebar'>
          <section className='meta-card property-editor' aria-labelledby='properties-title'>
            <div className='section-heading'>
              <h2 id='properties-title'>Customize properties</h2>
              <div className='property-editor-actions'>
                <button type='button' className='text-button' onClick={resetConfiguration}>
                  Reset
                </button>
                <button type='button' className='text-button' aria-expanded={jsonEditorOpen} aria-controls='effect-configuration-json' onClick={() => setJsonEditorOpen((open) => !open)}>
                  {jsonEditorOpen ? 'Close JSON editor' : 'Edit JSON'}
                </button>
              </div>
            </div>
            {jsonEditorOpen && (
              <div className='json-editor'>
                <label htmlFor='effect-configuration-json'>Supported effect configuration (JSON)</label>
                <p className='field-description'>Only properties declared for this effect can be changed. The animation implementation stays unchanged.</p>
                <textarea
                  id='effect-configuration-json'
                  className='control effect-configuration-json'
                  value={configurationJson}
                  onChange={(event) => editConfigurationJson(event.target.value)}
                  spellCheck={false}
                  aria-invalid={Boolean(configurationError)}
                  aria-describedby='effect-configuration-error'
                />
                <p id='effect-configuration-error' className='field-error' role={configurationError ? 'alert' : 'status'}>
                  {configurationError}
                </p>
                {configurationError ? (
                  <p className='field-description'>Fix the JSON or restore defaults before copying its configuration.</p>
                ) : (
                  <CodeBlock code={configurationJson} copyButtonLabel='Copy JSON' />
                )}
              </div>
            )}
            {effect.properties.length === 0 ? (
              <p>This effect does not declare configurable properties.</p>
            ) : (
              <div className='property-fields'>
                {effect.properties.map((property) => {
                  const value = properties[property.name];
                  const error = arrayInputErrors[property.name] ?? getEffectPropertyError(property, value) ?? '';
                  const controlId = `property-${property.name}`;

                  return (
                    <div className='property-field' key={property.name}>
                      <label htmlFor={controlId}>
                        {property.label}
                        {property.required ? ' *' : ''}
                      </label>
                      <p id={`${controlId}-help`} className='field-description'>
                        {property.description}
                      </p>
                      {property.type === 'boolean' ? (
                        <input
                          id={controlId}
                          type='checkbox'
                          checked={typeof value === 'boolean' ? value : false}
                          onChange={(event) => setProperty(property.name, event.target.checked)}
                          aria-describedby={`${controlId}-help`}
                        />
                      ) : property.type === 'enum' && property.options?.length ? (
                        <select
                          id={controlId}
                          className='control'
                          value={typeof value === 'string' ? value : ''}
                          onChange={(event) => setProperty(property.name, event.target.value)}
                          aria-describedby={`${controlId}-help`}
                        >
                          <option value=''>Select…</option>
                          {property.options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : property.type === 'array' ? (
                        <textarea
                          id={controlId}
                          className='control property-array'
                          value={arrayInputs[property.name] ?? (value === undefined ? '' : JSON.stringify(value, null, 2))}
                          onChange={(event) => {
                            const raw = event.target.value;
                            setArrayInputs((current) => ({
                              ...current,
                              [property.name]: raw,
                            }));
                            try {
                              const parsed: unknown = JSON.parse(raw);
                              const validationError = getEffectPropertyError(property, parsed);
                              if (validationError) throw new Error(validationError);
                              setProperty(property.name, parsed);
                            } catch (error) {
                              setArrayInputErrors((current) => ({
                                ...current,
                                [property.name]: error instanceof Error ? error.message : 'Enter a valid JSON array.',
                              }));
                            }
                          }}
                          aria-invalid={Boolean(error)}
                          aria-describedby={`${controlId}-help ${controlId}-error`}
                        />
                      ) : (
                        <input
                          id={controlId}
                          className='control'
                          type={property.type === 'number' ? 'number' : 'text'}
                          value={typeof value === 'string' || typeof value === 'number' ? value : ''}
                          onChange={(event) => setProperty(property.name, property.type === 'number' ? (event.target.value === '' ? undefined : Number(event.target.value)) : event.target.value)}
                          aria-invalid={Boolean(error)}
                          aria-describedby={`${controlId}-help ${controlId}-error`}
                        />
                      )}
                      <p id={`${controlId}-error`} className='field-error' aria-live='polite'>
                        {error}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className='meta-card'>
            <h2>Compatibility</h2>
            <p>Remotion: {effect.compatibility.remotion}</p>
            <p>React: {effect.compatibility.react}</p>
            <p>License: {effect.license}</p>
            <h3>Dependencies</h3>
            {effect.dependencies.length ? (
              <ul className='property-list'>
                {effect.dependencies.map((dependency) => (
                  <li key={dependency}>{dependency}</li>
                ))}
              </ul>
            ) : (
              <p>None declared.</p>
            )}
          </section>
        </aside>
      </div>
      {exportName && <p className='visually-hidden'>Integration code generated for {exportName}.</p>}
    </main>
  );
}
