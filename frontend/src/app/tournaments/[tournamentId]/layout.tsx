import { PinsLinkButton } from "@/app/tournaments/[tournamentId]/_components/pins-link-button";

export default async function TournamentLayout({
  children,
  params,
}: LayoutProps<"/tournaments/[tournamentId]">) {
  const { tournamentId } = await params;

  return (
    <>
      {children}
      <PinsLinkButton tournamentId={tournamentId} />
    </>
  );
}
