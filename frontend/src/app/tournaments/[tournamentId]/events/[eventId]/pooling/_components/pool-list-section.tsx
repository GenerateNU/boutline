import { getEventPools } from "../_services/get-event-pools";

import { PoolList } from "./pool-list";

interface PoolListSectionProps {
  eventId: string;
  poolingPath: string;
}

export async function PoolListSection({ eventId, poolingPath }: PoolListSectionProps) {
  return <PoolList pools={await getEventPools(eventId)} poolingPath={poolingPath} />;
}
