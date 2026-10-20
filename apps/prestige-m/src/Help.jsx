import { useLocation, useNavigate } from 'react-router-dom';
import { HelpButton } from '@pyfon/ui';
import { askAi } from './askAi.js';
import { SHOP_TOURS, SHOP_TOPICS, SHOP_FAQ } from './helpTours.js';

export default function Help() {
  const loc = useLocation();
  const go = useNavigate();
  return <HelpButton ai={askAi} path={loc.pathname} topics={SHOP_TOPICS} faq={SHOP_FAQ} tours={SHOP_TOURS} go={go} lift={loc.pathname === '/' ? 130 : 0} />;
}
