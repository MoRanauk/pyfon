import { useNavigate } from 'react-router-dom';

// A link that slides the current page out to the left, then opens the next page.
export function SwipeLink({ to, className, children }) {
  const go = useNavigate();
  function click(e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    const el = document.querySelector('.swipe-page');
    if (el) el.classList.add('swipe-out');
    setTimeout(() => go(to), 320);
  }
  return <a href={to} className={className} onClick={click}>{children}</a>;
}
