import { ExampleList } from "@/features/example/components/ExampleList";
import { getExamples } from "@/features/example/services/getExamples";

export default async function ExamplePage() {
  const examples = await getExamples();

  return (
    <main className="flex flex-col gap-6 p-24">
      <h1 className="text-3xl font-bold">Examples</h1>
      <ExampleList examples={examples} />
    </main>
  );
}
