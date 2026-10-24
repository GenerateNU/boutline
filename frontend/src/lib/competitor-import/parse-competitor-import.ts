import Papa from "papaparse";

import type {
  CompetitorImportPreview,
  CompetitorImportRow,
  CompetitorRating,
  ImportedCompetitor,
} from "@/types/competitor-import";

export const COMPETITOR_IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const COMPETITOR_IMPORT_MAX_ROWS = 5000;

type Column = Exclude<keyof ImportedCompetitor, "ratingYear">;

type CsvRecord = { line: number; cells: string[]; error?: string };

// Keyed by header with case, spacing, and punctuation stripped.
const COLUMNS = new Map<string, Column>([
  ["firstname", "firstName"],
  ["lastname", "lastName"],
  ["member", "memberNumber"],
  ["membernumber", "memberNumber"],
  ["club", "club"],
  ["division", "division"],
  ["country", "country"],
  ["birthdate", "birthdate"],
  ["gender", "gender"],
  ["rating", "rating"],
  ["event", "event"],
]);

const RATING = /^([A-E])(\d{2}|\d{4})?$/;

const EMPTY_COMPETITOR: ImportedCompetitor = {
  firstName: "",
  lastName: "",
  memberNumber: "",
  club: "",
  division: "",
  country: "",
  birthdate: "",
  gender: "",
  rating: "",
  event: "",
};

// Turns an uploaded registration CSV into a preview of rows. Problems with the
// whole file throw; problems with a single row are reported on that row.
export async function parseCompetitorImport(file: File): Promise<CompetitorImportPreview> {
  if (!file.name.toLowerCase().endsWith(".csv")) {
    throw new Error("upload must be a .csv file");
  }
  if (file.size > COMPETITOR_IMPORT_MAX_BYTES) {
    throw new Error("file is larger than 2 MiB");
  }
  const text = await file.text();
  if (text.includes("\uFFFD")) {
    throw new Error("file is not a text CSV");
  }

  const records = readRecords(text);
  if (records.length > COMPETITOR_IMPORT_MAX_ROWS + 1) {
    throw new Error(`file has more than ${COMPETITOR_IMPORT_MAX_ROWS} rows`);
  }
  const [header, ...body] = records;
  if (!header || header.error) {
    throw new Error("missing or malformed header row");
  }

  const { columns, unknownColumns } = readHeader(header.cells);
  const firstLineByMember = new Map<string, number>();
  const rows = body.map((record) => {
    const row = readRow(record, columns, header.cells.length);
    const member = row.competitor.memberNumber;
    if (!member) {
      return row;
    }
    const first = firstLineByMember.get(member);
    if (first === undefined) {
      firstLineByMember.set(member, row.line);
    } else {
      row.duplicateOf = first;
      if (row.status === "valid") {
        row.status = "duplicate";
      }
    }
    return row;
  });

  return { rows, unknownColumns };
}

// Splits the CSV into non-blank records, each tagged with the line it starts on
// (counted from PapaParse's position, so quoted multi-line cells stay correct).
// Stops one record past the row cap so an oversized file isn't read to the end.
function readRecords(text: string): CsvRecord[] {
  const records: CsvRecord[] = [];
  let rowStart = 0;
  let nextLine = 1;
  Papa.parse<string[]>(text, {
    delimiter: ",",
    step: ({ data, errors, meta }, parser) => {
      const line = nextLine;
      nextLine += text.slice(rowStart, meta.cursor).split("\n").length - 1;
      rowStart = meta.cursor;
      if (data.join("").trim() === "") {
        return;
      }
      records.push({ line, cells: data, error: errors[0]?.message });
      if (records.length > COMPETITOR_IMPORT_MAX_ROWS + 1) {
        parser.abort();
      }
    },
  });
  return records;
}

// Maps each recognized header to its column index and collects the rest as
// unknown. Throws if two headers mean the same field or none are recognized.
function readHeader(cells: string[]) {
  const columns = new Map<Column, number>();
  const unknownColumns: string[] = [];
  cells.forEach((cell, index) => {
    const name = cell.trim();
    const column = COLUMNS.get(name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ""));
    if (!column) {
      if (name) {
        unknownColumns.push(name);
      }
      return;
    }
    const first = columns.get(column);
    if (first !== undefined) {
      throw new Error(`columns "${cells[first].trim()}" and "${name}" are both ${column}`);
    }
    columns.set(column, index);
  });
  if (columns.size === 0) {
    throw new Error("header row has no recognized columns");
  }
  return { columns, unknownColumns };
}

// Reads one data record into a competitor and lists everything wrong with it.
// A malformed record gets only its CSV error, since its cells can't be trusted.
function readRow({ line, cells, error }: CsvRecord, columns: Map<Column, number>, width: number): CompetitorImportRow {
  if (error) {
    return { line, status: "invalid", competitor: { ...EMPTY_COMPETITOR }, errors: [`malformed CSV: ${error}`] };
  }
  const value = (column: Column) => {
    const index = columns.get(column);
    return index === undefined ? "" : (cells[index] ?? "").trim();
  };
  const rating = parseRating(value("rating"));
  const birthdate = parseBirthdate(value("birthdate"));
  const competitor: ImportedCompetitor = {
    firstName: value("firstName"),
    lastName: value("lastName"),
    memberNumber: value("memberNumber"),
    club: value("club"),
    division: value("division"),
    country: value("country"),
    birthdate: birthdate ?? "",
    gender: value("gender"),
    rating: rating?.rating ?? "",
    ratingYear: rating?.year,
    event: value("event"),
  };

  const hasFullName = competitor.firstName !== "" && competitor.lastName !== "";
  const hasMemberNumber = competitor.memberNumber !== "";
  const isUnidentifiable = !hasFullName && !hasMemberNumber;
  // Short rows and trailing empty cells lose nothing, so only extra data is an error.
  const hasSurplusData = cells.slice(width).join("").trim() !== "";
  const hasInvalidRating = rating === undefined;
  const hasInvalidBirthdate = birthdate === undefined;

  const errors = [
    isUnidentifiable && "needs a first and last name, or a member number",
    hasSurplusData && `has ${cells.length} cells but the header has ${width}`,
    hasInvalidRating && `invalid rating "${value("rating")}": must be A-E with an optional 2- or 4-digit year, or U`,
    hasInvalidBirthdate && `invalid birthdate "${value("birthdate")}": use YYYY-MM-DD or MM/DD/YYYY`,
  ].filter((message): message is string => Boolean(message));

  return { line, status: errors.length > 0 ? "invalid" : "valid", competitor, errors };
}

// Splits a rating like "C24" or "D2023" into its letter and year (2-digit years
// are 20xx). Blank means unrated (U); returns undefined when invalid.
function parseRating(raw: string): { rating: CompetitorRating; year?: number } | undefined {
  const value = raw.toUpperCase();
  if (value === "" || value === "U") {
    return { rating: "U" };
  }
  const match = RATING.exec(value);
  if (!match) {
    return undefined;
  }
  const [, rating, year] = match;
  return {
    rating: rating as CompetitorRating,
    year: year ? Number(year) + (year.length === 2 ? 2000 : 0) : undefined,
  };
}

// Normalizes a birthdate to YYYY-MM-DD. Blank stays blank; returns undefined
// when the value isn't a real date (round-tripping through Date rejects Feb 30).
function parseBirthdate(raw: string): string | undefined {
  if (raw === "") {
    return "";
  }
  // Parses MM/DD/YYYY into YYYY-MM-DD; a value already in YYYY-MM-DD passes
  // through. The regex captures a 1–2 digit month, a 1–2 digit day and a
  // 4-digit year separated by slashes, anchored so nothing else may surround it.
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
  const iso = us ? `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}` : raw;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return undefined;
  }
  const date = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(iso) ? iso : undefined;
}
