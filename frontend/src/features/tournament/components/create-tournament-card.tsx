import { Plus } from "lucide-react";
import Link from "next/link";

function CreateTournamentCard() {
  return (
    <Link
      href="/admin/tournament/new"
      className="flex items-center gap-3 rounded-[12px] border-[1.5px] border-dashed border-blue bg-blue-lightest p-4.5 transition-colors hover:bg-blue-lighter"
    >
      <p className="flex-1 font-medium text-blue">Create tournament</p>
      <div className="flex size-10 items-center justify-center rounded-full bg-blue text-white">
        <Plus aria-hidden className="size-5" />
      </div>
    </Link>
  );
}

export { CreateTournamentCard };
