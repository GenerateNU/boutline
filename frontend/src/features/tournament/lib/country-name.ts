const COUNTRY_NAMES = new Intl.DisplayNames(["en"], { type: "region" });

function countryName(code: string) {
  return COUNTRY_NAMES.of(code) ?? code;
}

export { countryName };
