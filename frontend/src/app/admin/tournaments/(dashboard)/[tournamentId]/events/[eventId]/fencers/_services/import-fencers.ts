import { parseCompetitorImport } from "@/lib/competitor-import/parse-competitor-import";
import { apiRequest } from "@/services/api-request";
import { errorMessage } from "@/utils/error-message";

interface ImportResult {
  added: number;
  skipped: number;
}

// Adds every valid row of a registration CSV to the event, one request each. Invalid and
// duplicate rows are skipped, as are rows missing what the API requires but the CSV doesn't.
// A failed request stops the import and says how many got in.
export async function importFencers(file: File, eventId: string): Promise<ImportResult> {
  const { rows } = await parseCompetitorImport(file);
  const valid = rows.filter(
    ({ status, competitor }) =>
      status === "valid" && competitor.gender && competitor.birthdate && competitor.division.trim(),
  );
  let added = 0;

  for (const { competitor } of valid) {
    try {
      await apiRequest("/competitors", {
        method: "POST",
        body: JSON.stringify({
          eventId,
          firstName: competitor.firstName.trim(),
          lastName: competitor.lastName.trim(),
          gender: competitor.gender,
          birthdate: competitor.birthdate,
          division: competitor.division.trim(),
          rating: competitor.rating || "U",
          // The parser keeps four-digit years; the API takes the last two.
          ratingYear: competitor.ratingYear === undefined ? undefined : competitor.ratingYear % 100,
          team: competitor.club.trim(),
          primaryClub: competitor.club.trim(),
          memberNumber: competitor.memberNumber.trim(),
        }),
      });
    } catch (err) {
      throw new Error(`Added ${added} of ${valid.length} fencers, then: ${errorMessage(err)}`);
    }
    added++;
  }

  return { added, skipped: rows.length - valid.length };
}
