import { useSearchParams } from 'react-router-dom';
import Series from './Series.jsx';
import DoYou from './DoYou.jsx';

export default function PersonalisedRoute() {
  const [q] = useSearchParams();
  return q.get('node') === 'do-you' ? <DoYou /> : <Series />;
}
