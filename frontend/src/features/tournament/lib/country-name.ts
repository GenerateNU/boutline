const countryNames = new Intl.DisplayNames(["en"], { type: "region" });

function countryName(code: string) {
  return countryNames.of(code) ?? code;
}

export { countryName };
