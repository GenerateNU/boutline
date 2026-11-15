import { SessionWatcher } from "@/features/auth/components/session-watcher";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <SessionWatcher />
      {children}
    </>
  );
}
