interface ConfirmResultBannerProps {
  winnerName: string;
  score: [number, number];
}

export function ConfirmResultBanner({ winnerName, score }: ConfirmResultBannerProps) {
  return (
    <div
      role="status"
      aria-label="Confirm result"
      className="flex flex-col items-center gap-2 rounded-xl bg-primary px-4 py-8 text-center text-primary-foreground"
    >
      <p className="text-4xl font-semibold tracking-wide uppercase">Confirm result</p>
      <p className="w-full text-xl font-medium break-words">
        {winnerName} wins {score[0]} - {score[1]}
      </p>
    </div>
  );
}
