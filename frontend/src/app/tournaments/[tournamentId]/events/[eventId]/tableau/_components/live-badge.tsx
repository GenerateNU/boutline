function LiveBadge() {
  return (
    <p className="flex items-center gap-1 pt-1 text-xs font-medium text-destructive">
      <span aria-hidden className="size-2 animate-pulse rounded-full bg-destructive" />
      Live
    </p>
  );
}

export { LiveBadge };
