import type { QualifyingResults, ResultFencer } from "../_types/results";

export function splitQualifying(fencers: ResultFencer[]): QualifyingResults {
  const qualifiers = fencers.filter((fencer) => fencer.status === "advanced");
  const disqualifiers = fencers.filter((fencer) => fencer.status === "eliminated");
  return {
    drawn: qualifiers.length + disqualifiers.length > 0,
    qualifiers,
    disqualifiers,
    qualifiedPercent: fencers.length === 0 ? 0 : Math.round((100 * qualifiers.length) / fencers.length),
  };
}
