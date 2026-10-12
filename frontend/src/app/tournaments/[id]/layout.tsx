import { TournamentTabs } from "./_components/tournament-tabs";

export default async function TournamentLayout({
  children,
  params,
}: LayoutProps<"/tournaments/[id]">) {
  const { id } = await params;

  return (
    <div className="mx-auto flex w-full max-w-mobile flex-col gap-10 px-4 py-10">
      <TournamentTabs id={id} />
      {children}
    </div>
  );
}
