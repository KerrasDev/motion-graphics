# Data Chart

Use the Data Chart effect to animate a quick comparison of metrics, performance categories, or campaign results.

## Example

```tsx
import { DataChart } from './index';

<DataChart
  title="Monthly performance"
  data={[
    { label: 'Jan', value: 22 },
    { label: 'Feb', value: 34 },
    { label: 'Mar', value: 18 },
  ]}
  duration={2}
  showLabels
/>
```
