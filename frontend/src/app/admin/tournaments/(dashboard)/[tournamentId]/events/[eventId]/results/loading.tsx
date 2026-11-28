import { Skeleton } from "@/components/primitives/skeleton";

const ROW_COUNT = 6;

export default function ResultsLoading() {
  return (
    <div className="flex flex-col gap-3">
      <p role="status" className="sr-only">
        Loading results
      </p>
      {Array.from({ length: ROW_COUNT }, (_, index) => (
        <Skeleton key={index} className="h-18 rounded-[12px]" />
      ))}
    </div>
  );
}
