import { getPoolStageResults } from "../_services/get-pool-stage-results";

import { PoolStageResults } from "./pool-stage-results";

export async function PoolStageResultsSection({ eventId }: { eventId: string }) {
  return <PoolStageResults results={await getPoolStageResults(eventId)} />;
}
