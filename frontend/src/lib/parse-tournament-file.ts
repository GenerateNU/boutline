const fields = ["name", "location", "venue", "date", "fees", "description"] as const;

type TournamentDetails = Partial<Record<(typeof fields)[number], string>>;

// A key matches a field after lowercasing and dropping non-letters: "Venue" and "VENUE" match, "Tournament Name" does not.
const normalize = (key: string) => key.toLowerCase().replace(/[^a-z]/g, "");

function pickFields(entries: [string, string][]): TournamentDetails {
  const details: TournamentDetails = {};
  for (const [key, value] of entries) {
    const field = fields.find((candidate) => candidate === normalize(key));
    if (field && value.trim() && !details[field]) details[field] = value.trim();
  }
  return details;
}

// Quote-aware so commas inside a quoted cell survive; a cell spanning lines is not supported.
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quoted && char === '"' && line[i + 1] === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(cell);
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells;
}

function parseCsv(text: string): TournamentDetails {
  const [header = "", row = ""] = text.split(/\r?\n/).filter((line) => line.trim());
  const values = splitCsvLine(row);
  return pickFields(splitCsvLine(header).map((key, i) => [key, values[i] ?? ""]));
}

// Reads both <name>…</name> leaf elements and name="…" attributes, first match in document order winning.
function parseXml(text: string): TournamentDetails {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("Could not read this XML file.");

  const entries: [string, string][] = [];
  for (const element of Array.from(doc.getElementsByTagName("*"))) {
    for (const attribute of Array.from(element.attributes)) {
      entries.push([attribute.name, attribute.value]);
    }
    if (element.children.length === 0) {
      entries.push([element.tagName, element.textContent ?? ""]);
    }
  }
  return pickFields(entries);
}

async function parseTournamentFile(file: File): Promise<TournamentDetails> {
  const text = await file.text();
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "csv") return parseCsv(text);
  if (extension === "xml") return parseXml(text);
  throw new Error("Only .csv and .xml files are supported.");
}

export { parseTournamentFile };
