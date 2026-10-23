import Image from "next/image";
import Link from "next/link";

function CreateTournamentCard() {
  return (
    <Link
      href="/admin/tournament/new"
      className="flex h-24 items-center gap-3 border border-brand px-5 text-brand transition-colors hover:bg-muted"
    >
      <div className="flex flex-1 flex-col gap-1">
        <p className="text-xl leading-6 font-medium">CREATE TOURNAMENT</p>
        <p className="text-sm leading-5">Start a new tournament</p>
      </div>
      <span className="shrink-0 rounded-full border border-brand bg-chip p-2">
        <Image src="/add.svg" alt="" width={24} height={24} />
      </span>
    </Link>
  );
}

export { CreateTournamentCard };
