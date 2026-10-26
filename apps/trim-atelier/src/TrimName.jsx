import './tn.css';
import { SITE } from './site.js';

// Shows TriM with an italic gold "ri". Plain text elsewhere stays plain.
export function TrimName({ text }) {
  const parts = String(text == null ? SITE.name : text).split('TriM');
  const out = [];
  parts.forEach((p, i) => {
    if (i > 0) out.push(<span className="tn" key={'n' + i}>T<i>ri</i>M</span>);
    if (p) out.push(p);
  });
  return <>{out}</>;
}
