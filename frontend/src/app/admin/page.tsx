import { redirect } from "next/navigation";

// /admin is reserved for the organizer console; until it exists, the
// tournament list is the admin home.
export default function AdminPage() {
  redirect("/admin/tournaments");
}
