/** Mycket enkel **fetstil**-rendering för kodgenererade meningar. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return <>{parts.map((p, i) => (p.startsWith("**") ? <strong key={i} className="font-semibold text-text">{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>))}</>;
}
