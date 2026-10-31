import { Section } from "@/components/primitives/section";
import { SearchForm } from "@/features/tournament/components/search-form";
import { readStringParam } from "@/lib/search-params";

import { RefereeList } from "./_components/referee-list";

export default async function RefereesTab({
  params,
  searchParams,
}: PageProps<"/tournaments/[tournamentId]/referees">) {
  const [{ tournamentId }, query] = await Promise.all([params, searchParams]);
  const search = readStringParam(query, "q");

  return (
    <Section title="Referees">
      <SearchForm
        action={`/tournaments/${tournamentId}/referees`}
        label="Search referees"
        placeholder="e.g. Jordan Lee"
        defaultValue={search}
      />
      <RefereeList search={search} />
    </Section>
  );
}
