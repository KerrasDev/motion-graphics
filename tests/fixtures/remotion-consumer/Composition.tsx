import { DataChart } from '../../../registry/exports/data-chart';
import { KineticTitle } from '../../../registry/exports/kinetic-title';
import { NumberCounter } from '../../../registry/exports/number-counter';

export function RemotionConsumerComposition() {
  return (
    <div>
      <KineticTitle text='Consumer project' fontSize={64} />
      <NumberCounter start={0} end={250} duration={3} precision={1} />
      <DataChart data={[{ label: 'Q1', value: 25 }]} colors={['#2563eb']} />
    </div>
  );
}
