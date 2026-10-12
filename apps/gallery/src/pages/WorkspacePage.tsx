import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { isWorkspaceUploadPathAllowed } from '@motion-graphics/core';
import {
  isWorkspaceApiConfigured,
  workspaceApi,
  type CreatedWorkspaceRepository,
  type WorkspaceUploadFile,
} from '../features/workspaces/workspace.api';

type WorkspaceUser = { id: number; login: string; avatarUrl: string };
const maxWorkspaceFileCount = 500;
const maxWorkspaceFileBytes = 256 * 1024;
const maxWorkspaceTotalBytes = 512 * 1024;

export default function WorkspacePage() {
  const [loading, setLoading] = useState(isWorkspaceApiConfigured);
  const [user, setUser] = useState<WorkspaceUser | null>(null);
  const [csrfToken, setCsrfToken] = useState('');
  const [apiError, setApiError] = useState(
    isWorkspaceApiConfigured ? '' : 'The workspace API URL is not configured for this deployment.',
  );
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [uploadMode, setUploadMode] = useState<'workspace' | 'scaffold'>('workspace');
  const [uploadFiles, setUploadFiles] = useState<WorkspaceUploadFile[]>([]);
  const [excludedFileCount, setExcludedFileCount] = useState(0);
  const [fileSelectionError, setFileSelectionError] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdRepository, setCreatedRepository] = useState<CreatedWorkspaceRepository | null>(null);
  const folderInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    if (!isWorkspaceApiConfigured) {
      return;
    }

    workspaceApi.getSession()
      .then((session) => {
        if (!active) return;
        if (session.authenticated) {
          setUser(session.user);
          setCsrfToken(session.csrfToken);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setApiError(error instanceof Error ? error.message : 'Unable to connect to the workspace API.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const selectWorkspaceFolder = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = '';
    setFileSelectionError('');
    setUploadFiles([]);
    setExcludedFileCount(0);

    const filesToRead = selectedFiles.flatMap((file) => {
      const relativePath = file.webkitRelativePath || file.name;
      const rootSeparator = relativePath.indexOf('/');
      const path = rootSeparator >= 0 ? relativePath.slice(rootSeparator + 1) : relativePath;
      return isWorkspaceUploadPathAllowed(path) ? [{ file, path }] : [];
    });
    let excludedCount = selectedFiles.length - filesToRead.length;
    if (filesToRead.length > maxWorkspaceFileCount) {
      setFileSelectionError(`Select no more than ${maxWorkspaceFileCount} files after safety filters.`);
      return;
    }

    const files: WorkspaceUploadFile[] = [];
    let totalBytes = 0;
    try {
      for (const { file, path } of filesToRead) {
        if (file.size > maxWorkspaceFileBytes) {
          excludedCount += 1;
          continue;
        }

        const content = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
        const fileBytes = new TextEncoder().encode(content).byteLength;
        if (totalBytes + fileBytes > maxWorkspaceTotalBytes) {
          throw new Error('The selected text files exceed the 512 KiB total upload limit.');
        }

        totalBytes += fileBytes;
        files.push({ path, content });
      }
    } catch (error) {
      setFileSelectionError(error instanceof Error
        ? error.message
        : 'The selected folder could not be read as UTF-8 text files.');
      return;
    }

    setExcludedFileCount(excludedCount);
    setUploadFiles(files);
    if (files.length === 0) {
      setFileSelectionError('No safe UTF-8 text files were found in the selected folder.');
    }
  };

  const createRepository = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    setApiError('');
    setCreatedRepository(null);
    try {
      const repository = await workspaceApi.createRepository({
        name,
        description,
        private: isPrivate,
        ...(uploadMode === 'workspace' ? { files: uploadFiles } : {}),
      }, csrfToken);
      setCreatedRepository(repository);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Repository creation failed.');
    } finally {
      setCreating(false);
    }
  };

  const logout = async () => {
    setApiError('');
    try {
      await workspaceApi.logout(csrfToken);
      setUser(null);
      setCsrfToken('');
      setCreatedRepository(null);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Unable to disconnect GitHub.');
    }
  };

  const isPermissionError = apiError && apiError.toLowerCase().includes('permission');
  const uploadSizeKiB = Math.ceil(uploadFiles.reduce(
    (total, file) => total + new TextEncoder().encode(file.content).byteLength,
    0,
  ) / 1024);

  return (
    <main className="gallery-shell workspace-page">
      <nav className="detail-header" aria-label="Workspace navigation">
        <Link to="/" className="secondary-button">← Gallery</Link>
        <Link to="/docs">Documentation</Link>
      </nav>
      <p className="eyebrow">GitHub workspace</p>
      <h1>Create an effects repository</h1>
      <p className="workspace-intro">
        Create a repository with the current workspace files or start with a minimal scaffold.
        Files are sent to GitHub only after you review the selection and submit the form.
      </p>

      {loading ? <p role="status">Checking GitHub connection…</p> : null}

      {!loading && apiError && (
        <section className="workspace-notice error-state" role="alert">
          <h2>Request could not be completed</h2>
          <p>{apiError}</p>
          {isPermissionError && (
            <p>Ask the GitHub App administrator to grant repository Administration and Contents write permissions.</p>
          )}
        </section>
      )}

      {!loading && !user && !apiError && (
        <section className="meta-card workspace-card">
          <h2>Connect your GitHub account</h2>
          <p>GitHub opens its authorization page. The application keeps access tokens on the API server, not in this browser.</p>
          <button
            type="button"
            className="primary-button"
            onClick={() => window.location.assign(workspaceApi.getGitHubStartUrl())}
          >
            Connect GitHub
          </button>
        </section>
      )}

      {!loading && user && (
        <>
          <section className="meta-card workspace-card workspace-user">
            <div>
              <h2>Connected as @{user.login}</h2>
              <p>New repositories are created in this GitHub account.</p>
            </div>
            <button type="button" className="secondary-button" onClick={() => void logout()}>
              Disconnect
            </button>
          </section>

          <form className="meta-card workspace-form" onSubmit={(event) => void createRepository(event)}>
            <h2>New repository</h2>
            <label>
              Repository name
              <input
                className="control"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                minLength={1}
                maxLength={100}
                pattern="[A-Za-z0-9._-]+"
                autoComplete="off"
              />
              <span className="field-description">Use letters, numbers, periods, underscores, or hyphens.</span>
            </label>
            <fieldset className="workspace-upload-options">
              <legend>Repository contents</legend>
              <label className="workspace-visibility">
                <input
                  type="radio"
                  name="uploadMode"
                  value="workspace"
                  checked={uploadMode === 'workspace'}
                  onChange={() => setUploadMode('workspace')}
                />
                Upload a local workspace folder
              </label>
              <label className="workspace-visibility">
                <input
                  type="radio"
                  name="uploadMode"
                  value="scaffold"
                  checked={uploadMode === 'scaffold'}
                  onChange={() => setUploadMode('scaffold')}
                />
                Create only the starter scaffold
              </label>
              {uploadMode === 'workspace' && (
                <div className="workspace-folder-picker">
                  <input
                    ref={folderInput}
                    className="workspace-folder-input"
                    type="file"
                    multiple
                    onChange={(event) => void selectWorkspaceFolder(event)}
                    aria-label="Select workspace folder"
                  />
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      const input = folderInput.current;
                      if (input) {
                        input.setAttribute('webkitdirectory', '');
                        input.click();
                      }
                    }}
                  >
                    Choose workspace folder
                  </button>
                  <p className="field-description">
                    Uploads UTF-8 text files only, up to 500 files and 512 KiB total. Binary files are skipped.
                    The browser will send selected file contents to the API and GitHub after you create the repository.
                  </p>
                  {uploadFiles.length > 0 && (
                    <details className="workspace-file-review">
                      <summary>Review {uploadFiles.length} files ({uploadSizeKiB} KiB)</summary>
                      <ul>
                        {uploadFiles.map((file) => <li key={file.path}><code>{file.path}</code></li>)}
                      </ul>
                    </details>
                  )}
                  {excludedFileCount > 0 && (
                    <p className="field-description" role="status">
                      Excluded {excludedFileCount} files by safety filters, size limits, or text decoding.
                    </p>
                  )}
                  {fileSelectionError && <p className="workspace-warning" role="alert">{fileSelectionError}</p>}
                </div>
              )}
            </fieldset>
            <label>
              Description
              <textarea
                className="control"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={350}
                rows={3}
              />
            </label>
            <label className="workspace-visibility">
              <input type="checkbox" checked={isPrivate} onChange={(event) => setIsPrivate(event.target.checked)} />
              Create as a private repository (recommended)
            </label>
            {!isPrivate && (
              <p className="workspace-warning" role="note">
                This repository and every uploaded file will be public. Review the selected paths and contents carefully.
                No license is added automatically.
              </p>
            )}
            <button
              type="submit"
              className="primary-button"
              disabled={creating || !csrfToken || (uploadMode === 'workspace' && uploadFiles.length === 0)}
            >
              {creating ? 'Creating repository…' : `Create ${isPrivate ? 'private' : 'public'} repository`}
            </button>
          </form>
        </>
      )}

      {createdRepository && (
        <section className="meta-card workspace-success" role="status">
          <h2>Workspace repository created</h2>
          <p>
            <a href={createdRepository.url} target="_blank" rel="noreferrer">{createdRepository.fullName}</a>
            {' '}({createdRepository.visibility}) on branch <code>{createdRepository.defaultBranch}</code>.
          </p>
          <p>
            {createdRepository.uploadMode === 'workspace'
              ? `${createdRepository.uploadedFileCount} workspace files were uploaded in one commit.`
              : 'The starter scaffold was uploaded in one commit.'}
            {' '}Add a license before distributing the project.
          </p>
        </section>
      )}
    </main>
  );
}
