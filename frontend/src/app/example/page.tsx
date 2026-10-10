import { Counter } from "@/features/example/components/Counter";
import { getCounterConfig } from "@/features/example/services/getCounterConfig";

export default async function ExamplePage() {
  const config = await getCounterConfig();

  return (
    <main className="flex flex-col gap-6 p-24">
      <h1 className="text-3xl font-bold">Counter</h1>
      <Counter config={config} />
    </main>
  );
}
