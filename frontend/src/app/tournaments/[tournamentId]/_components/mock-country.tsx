// MOCK. Competitors have no country column, so every row claims the same code.
// Delete this component once the backend stores a real country — grep for
// MockCountry to find the call sites.
function MockCountry() {
  return (
    <span
      className="shrink-0"
      title="Placeholder — country is not stored yet"
    >
      US
    </span>
  );
}

export { MockCountry };
