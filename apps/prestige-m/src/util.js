// Turns an API error into one readable sentence.
export function errText(e) {
  if (e && Array.isArray(e.details) && e.details.length) {
    return e.details.map((d) => d.message).filter(Boolean).join('. ') || e.message;
  }
  return (e && e.message) || 'Something went wrong.';
}
