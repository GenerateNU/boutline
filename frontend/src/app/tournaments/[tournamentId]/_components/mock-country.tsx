// MOCK. Competitors have no country column, so every row claims the same flag.
// Delete this component once the backend stores a real country — grep for
// MockCountry to find the call sites.
function MockCountry() {
  return (
    <span
      role="img"
      aria-label="United States (placeholder)"
      className="shrink-0 text-sm leading-none"
      title="Placeholder — country is not stored yet"
    >
      🇺🇸
    </span>
  );
}

export { MockCountry };
