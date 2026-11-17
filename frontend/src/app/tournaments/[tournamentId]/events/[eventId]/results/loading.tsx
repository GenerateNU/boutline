import { Section } from "@/components/primitives/section";
import { Skeleton } from "@/components/primitives/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/primitives/tabs";

export default function ResultsTabLoading() {
  return (
    <div className="flex flex-col gap-4">
      <span role="status" className="sr-only">
        Loading results
      </span>
      <Section title="Results">
        <p className="text-sm text-muted-foreground">
          Placeholder results — the same for every event until the results API exists.
        </p>
        <Tabs defaultValue="post-pool">
          <TabsList>
            <TabsTrigger value="post-pool">Post-pool standings</TabsTrigger>
            <TabsTrigger value="post-de">Post-DE standings</TabsTrigger>
          </TabsList>
          <TabsContent value="post-pool" className="pt-2">
            <ul aria-hidden className="flex flex-col gap-3">
              {Array.from({ length: 8 }, (_, index) => (
                <li
                  key={index}
                  className="flex items-center gap-3 rounded-md border border-foreground px-3 py-2"
                >
                  <Skeleton className="h-4 w-6 shrink-0" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Skeleton className="h-4 w-40 max-w-full" />
                    <Skeleton className="h-3 w-28 max-w-full" />
                  </div>
                  <Skeleton className="h-5 w-8 shrink-0" />
                  <Skeleton className="size-4 shrink-0" />
                </li>
              ))}
            </ul>
          </TabsContent>
        </Tabs>
      </Section>
    </div>
  );
}
