type TokenPanelProps = {
  title: string;
  token: string;
};

export function TokenPanel({ title, token }: TokenPanelProps) {
  return (
    <section className="tokenPanel" aria-live="polite">
      <div>
        <span className="eyebrow">One-time token</span>
        <h2>{title}</h2>
        <p>Store this token now. The backend will not return the raw token again.</p>
      </div>
      <code>{token}</code>
    </section>
  );
}
