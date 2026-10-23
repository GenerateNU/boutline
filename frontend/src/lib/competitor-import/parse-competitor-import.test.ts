import {
  COMPETITOR_IMPORT_MAX_BYTES,
  COMPETITOR_IMPORT_MAX_ROWS,
  parseCompetitorImport,
} from "@/lib/competitor-import/parse-competitor-import";

// The ticket's example upload, plus a blank line 10.
const EXAMPLE = `Last Name,First Name,Member #,Club,Division,Country,Birth Date,Gender,Rating,Event
Alvarez,Maria,100234501,Boston Fencing Club,New England,USA,2011-03-14,F,C24,Y14 Women's Foil
Chen,Lily,100234502,Boston Fencing Club,New England,USA,2012-07-02,F,U,Y14 Women's Foil
O'Brien,Kate,100234503,Cambridge Fencing Academy,New England,USA,03/22/2011,F,D2023,Y14 Women's Foil
"  Nguyen "," An ",,,New England,USA,2011-09-05,F,E25,Y14 Women's Foil
Patel,Riya,100234505,Cambridge Fencing Academy,New England,USA,2012-01-18,F,X24,Y14 Women's Foil
,,,Boston Fencing Club,New England,USA,,F,U,Y14 Women's Foil
Alvarez,Maria,100234501,Boston Fencing Club,New England,USA,2011-03-14,F,C24,Y14 Women's Foil
Smith,Jordan,100234510,Cambridge Fencing Academy,New England,USA,2005-11-30,M,B25,Div II Men's Epee
,,,,,,,,,
`;

const HEADER = "First Name,Last Name,Member #,Rating,Birth Date\n";

const csv = (content: BlobPart, name = "registrations.csv") => new File([content], name, { type: "text/csv" });

describe("parseCompetitorImport with the ticket's example file", () => {
  it.each([
    {
      name: "valid with a 2-digit rating year",
      line: 2,
      status: "valid",
      competitor: { firstName: "Maria", memberNumber: "100234501", rating: "C", ratingYear: 2024 },
    },
    { name: "unrated", line: 3, status: "valid", competitor: { firstName: "Lily", rating: "U" } },
    {
      name: "US date and 4-digit rating year",
      line: 4,
      status: "valid",
      competitor: { birthdate: "2011-03-22", rating: "D", ratingYear: 2023 },
    },
    {
      name: "whitespace trimmed, no member number, unattached",
      line: 5,
      status: "valid",
      competitor: { firstName: "An", lastName: "Nguyen", memberNumber: "", club: "" },
    },
    { name: "invalid rating", line: 6, status: "invalid", error: '"X24"' },
    { name: "no name and no member number", line: 7, status: "invalid", error: "name" },
    { name: "duplicate of line 2", line: 8, status: "duplicate", duplicateOf: 2 },
    { name: "different event", line: 9, status: "valid", competitor: { event: "Div II Men's Epee" } },
  ])("line $line: $name", async ({ line, status, competitor, error, duplicateOf }) => {
    const { rows } = await parseCompetitorImport(csv(EXAMPLE));
    const row = rows.find((candidate) => candidate.line === line);

    expect(row).toMatchObject({ status, competitor: competitor ?? {} });
    expect(row?.duplicateOf).toBe(duplicateOf);
    if (error) {
      expect(row?.errors.join("; ")).toContain(error);
    } else {
      expect(row?.errors).toEqual([]);
    }
  });

  it("skips blank line 10 and reports no unknown columns", async () => {
    const { rows, unknownColumns } = await parseCompetitorImport(csv(EXAMPLE));

    expect(rows.map((row) => row.line)).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
    expect(unknownColumns).toEqual([]);
  });
});

describe("parseCompetitorImport row handling", () => {
  it.each([
    {
      name: "header case and punctuation are ignored",
      file: "FIRST NAME, last_name ,member-number\nLee,Kiefer,1\n",
      lines: [2],
      statuses: ["valid"],
    },
    {
      name: "unknown columns are listed",
      file: "First Name,Last Name,Team Color\nLee,Kiefer,red\n",
      lines: [2],
      statuses: ["valid"],
      unknown: ["Team Color"],
    },
    {
      name: "a byte-order mark is stripped",
      file: "﻿First Name,Last Name\nLee,Kiefer\n",
      lines: [2],
      statuses: ["valid"],
    },
    { name: "lowercase rating without a year", file: `${HEADER}Lee,Kiefer,1,c,\n`, lines: [2], statuses: ["valid"] },
    { name: "U with a year", file: `${HEADER}Lee,Kiefer,1,U24,\n`, lines: [2], statuses: ["invalid"], error: "rating" },
    { name: "3-digit rating year", file: `${HEADER}Lee,Kiefer,1,C123,\n`, lines: [2], statuses: ["invalid"], error: "rating" },
    { name: "impossible date", file: `${HEADER}Lee,Kiefer,1,U,2011-13-01\n`, lines: [2], statuses: ["invalid"], error: "birthdate" },
    { name: "member number alone is enough", file: `${HEADER},,1,U,\n`, lines: [2], statuses: ["valid"] },
    { name: "short row", file: `${HEADER}Lee,Kiefer\n`, lines: [2], statuses: ["valid"] },
    {
      name: "surplus cell with data",
      file: `${HEADER}Lee,Kiefer,1,U,,extra\n`,
      lines: [2],
      statuses: ["invalid"],
      error: "has 6 cells but the header has 5",
    },
    { name: "surplus empty cells", file: `${HEADER}Lee,Kiefer,1,U,,,\n`, lines: [2], statuses: ["valid"] },
    {
      name: "line numbers count blank lines and quoted newlines",
      file: 'First Name,Last Name\nLee,Kiefer\n\n"Multi\nLine",Kiefer\nAlex,Massialas\n',
      lines: [2, 4, 6],
      statuses: ["valid", "valid", "valid"],
    },
    {
      name: "a malformed row is reported without failing the file",
      file: 'First Name,Last Name\nLee,Kiefer\nAlex,"Mass"ialas\n',
      lines: [2, 3],
      statuses: ["valid", "invalid"],
      error: "Malformed CSV",
    },
    { name: "header only", file: "First Name,Last Name\n", lines: [], statuses: [] },
  ])("$name", async ({ file, lines, statuses, unknown, error }) => {
    const preview = await parseCompetitorImport(csv(file));
    const errors = preview.rows.flatMap((row) => row.errors).join("; ");

    expect(preview.rows.map((row) => row.line)).toEqual(lines);
    expect(preview.rows.map((row) => row.status)).toEqual(statuses);
    expect(preview.unknownColumns).toEqual(unknown ?? []);
    if (error) {
      expect(errors.toLowerCase()).toContain(error.toLowerCase());
    } else {
      expect(errors).toBe("");
    }
  });
});

describe("parseCompetitorImport rejects the whole file", () => {
  const tooManyRows = `First Name,Last Name\n${"A,B\n".repeat(COMPETITOR_IMPORT_MAX_ROWS + 1)}`;

  it.each([
    { name: "not a .csv", file: csv(EXAMPLE, "registrations.xlsx"), message: ".csv" },
    { name: "binary content", file: csv(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0xff])), message: "not a text CSV" },
    { name: "empty file", file: csv(""), message: "header" },
    { name: "no recognized headers", file: csv("foo,bar\n1,2\n"), message: "no recognized columns" },
    {
      name: "two headers for the same field",
      file: csv("First Name,Last Name,Member #,Member Number\nLee,Kiefer,1,\n"),
      message: '"Member #" and "Member Number"',
    },
    { name: "same header twice in different case", file: csv("First Name,first name,Last Name\n"), message: "are both firstName" },
    { name: "too many rows", file: csv(tooManyRows), message: `more than ${COMPETITOR_IMPORT_MAX_ROWS} rows` },
    { name: "too large", file: csv("a".repeat(COMPETITOR_IMPORT_MAX_BYTES + 1)), message: "larger than 2 MiB" },
  ])("$name", async ({ file, message }) => {
    await expect(parseCompetitorImport(file)).rejects.toThrow(message);
  });
});
