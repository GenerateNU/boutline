import AddOutlined from "@mui/icons-material/AddOutlined";
import Link from "next/link";

function CreateTournamentCard() {
  return (
    <Link
      href="/admin/tournament/new"
      className="flex items-center gap-3 rounded-[12px] border-[1.5px] border-blue bg-blue-lightest p-4.5 transition-colors hover:bg-blue-lighter"
    >
      <div className="flex flex-1 flex-col gap-0.5">
        <p className="font-medium text-blue">Create tournament</p>
      </div>
      <AddOutlined aria-hidden className="size-10 shrink-0 rounded-full bg-blue p-2.5 text-white" />
    </Link>
  );
}

export { CreateTournamentCard };
