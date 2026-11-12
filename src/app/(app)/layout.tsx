import { AppShell } from "@/components/ds/AppShell";

// Authenticated area. The auth guard (FR-AUTH-04) is added with the middleware on Day 1.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
