# Motion Graphics Skill

Use this skill when adapting a Motion Graphics effect into an existing Remotion composition.

## Steps

1. Identify the effect that best matches the requested scene or motion pattern.
2. Inspect the project's composition dimensions, frame rate, and total duration before editing.
3. Read the effect metadata and documentation in `packages/effects/<effect-id>/`.
4. Import the effect from the workspace or from the generated registry.
5. Adapt supported properties to the target content, but avoid unsupported or unrelated changes.
6. Keep imports narrow and avoid adding new dependencies unless clearly necessary.
7. Test the composition locally before rendering a final output.
8. Explain any compatibility limitations, especially when target projects use different frame rates or aspect ratios.

## Copyable integration prompt

```text
Use the Motion Graphics effect <effect-id> for this project.
Review the destination composition dimensions, frame rate, scene duration, and asset constraints before making changes.
Adapt only the supported properties required for this scene and avoid unrelated edits.
Keep the import path minimal and reuse the effect metadata and README for guidance.
```
