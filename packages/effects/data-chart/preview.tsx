import { DataChart } from './index';

export default function DataChartPreview() {
  return (
    <DataChart
      title="Monthly performance"
      data={[
        { label: 'Jan', value: 12 },
        { label: 'Feb', value: 26 },
        { label: 'Mar', value: 18 },
        { label: 'Apr', value: 32 },
      ]}
      duration={2}
      showLabels
    />
  );
}
