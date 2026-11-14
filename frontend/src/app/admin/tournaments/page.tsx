import { redirect } from "next/navigation";

// The admin home moved to /admin; this keeps old links and bookmarks working.
export default function AdminTournamentsPage() {
  redirect("/admin");
}
