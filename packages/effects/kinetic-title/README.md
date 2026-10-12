# Kinetic Title

A lightweight animated title component for openers, intros, and scene transitions.

## Props

- `text`: headline content
- `color`: text color
- `fontSize`: size in pixels
- `duration`: animation duration in seconds
- `verticalOffset`: vertical start position in pixels
- `fadeIn`: toggles opacity animation

## Example

```tsx
import { KineticTitle } from './index';

<KineticTitle
  text="Launch Sequence"
  color="#f8fafc"
  fontSize={84}
  duration={2.2}
  verticalOffset={90}
  fadeIn
/>
```
