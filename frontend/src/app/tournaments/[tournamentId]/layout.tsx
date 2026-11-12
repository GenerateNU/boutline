export default function TournamentLayout({
  children,
}: LayoutProps<"/tournaments/[tournamentId]">) {
  return (
    <div className="mx-auto flex w-full max-w-mobile flex-col gap-10 px-4 py-10">
      {children}
    </div>
  );
}
