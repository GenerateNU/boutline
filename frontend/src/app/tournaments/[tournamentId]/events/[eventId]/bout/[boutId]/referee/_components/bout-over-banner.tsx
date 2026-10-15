interface BoutOverBannerProps {
  winnerName: string | null;
}

export function BoutOverBanner({ winnerName }: BoutOverBannerProps) {
  return (
    <div
      role="status"
      aria-label="Bout over"
      className="flex flex-col items-center gap-2 rounded-xl bg-primary px-4 py-8 text-center text-primary-foreground"
    >
      <p className="text-4xl font-semibold tracking-wide uppercase">Bout over</p>
      {winnerName && <p className="w-full text-xl font-medium break-words">{winnerName} wins</p>}
    </div>
  );
}
