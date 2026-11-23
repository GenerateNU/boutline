import type { ListResponse } from "@/types/list-response";

// The backend's maximum page size.
export const PAGE_LIMIT = 100;

// The first page carries the total, so the rest are fetched together once it's known.
export async function getAllPages<T>(getPage: (offset: number) => Promise<ListResponse<T>>): Promise<T[]> {
  const first = await getPage(0);
  const offsets = [];
  for (let offset = PAGE_LIMIT; offset < first.total; offset += PAGE_LIMIT) {
    offsets.push(offset);
  }
  const rest = await Promise.all(offsets.map((offset) => getPage(offset)));
  return [first, ...rest].flatMap((page) => page.data);
}
