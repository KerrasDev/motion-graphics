export interface WorkspaceScaffoldInput {
  name: string;
  description: string;
  defaultBranch: string;
}

export function createWorkspaceScaffold(input: WorkspaceScaffoldInput): Array<{ path: string; content: string }> {
  const description = input.description.trim();
  const workspaceManifest = {
    format: 'motion-workspace',
    schemaVersion: 1,
    name: input.name,
    description,
    effectsDirectory: 'effects',
    defaultBranch: input.defaultBranch,
  };

  return [
    {
      path: 'motion-workspace.json',
      content: `${JSON.stringify(workspaceManifest, null, 2)}\n`,
    },
    {
      path: 'README.md',
      content: [
        `# ${input.name}`,
        '',
        description || 'A Motion Graphics effects workspace.',
        '',
        '## Add an effect',
        '',
        'Create a directory under `effects/<effect-id>/` containing an `effect.json` manifest, an `index.tsx` entry, a `preview.tsx`, and a `README.md`.',
        'Use the Motion Graphics effect contract and validate the manifest before sharing it.',
        '',
        'This repository was initialized as a workspace. No license has been selected; add a `LICENSE` file before distributing its contents.',
        '',
      ].join('\n'),
    },
    {
      path: 'effects/README.md',
      content: [
        '# Effects',
        '',
        'Add each effect in its own directory. Keep effect source, manifest, preview, and documentation together.',
        '',
      ].join('\n'),
    },
  ];
}
