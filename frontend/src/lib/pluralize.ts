function regularPlural(singular: string) {
  if (/(s|x|z|ch|sh)$/i.test(singular)) {
    return `${singular}es`;
  }
  if (/[^aeiou]y$/i.test(singular)) {
    return `${singular.slice(0, -1)}ies`;
  }
  return `${singular}s`;
}

// Irregular words (person → people) need the explicit plural.
function pluralize(
  count: number,
  singular: string,
  plural = regularPlural(singular),
) {
  return count === 1 ? singular : plural;
}

export { pluralize };
