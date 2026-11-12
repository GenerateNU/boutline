import { PinsLinkButton } from "@/app/tournaments/[tournamentId]/_components/pins-link-button";

export default async function TournamentLayout({
  children,
  params,
}: LayoutProps<"/tournaments/[tournamentId]">) {
  const { tournamentId } = await params;

  return (
    <div className="mx-auto flex w-full max-w-mobile flex-col gap-10 px-4 pt-10 pb-20">
      {children}
      <PinsLinkButton tournamentId={tournamentId} />
    </div>
  );
}
