// Main navigation (PRD 7.1): five tabs, shared by TabBar (mobile) and NavRail (desktop).
export const NAV_ITEMS = [
  { href: "/hari-ini", label: "Hari Ini", icon: "sun" },
  { href: "/lomba", label: "Lomba", icon: "trophy" },
  { href: "/ata", label: "Tanya Ata", icon: "message" },
  { href: "/progres", label: "Progres", icon: "chart" },
  { href: "/profil", label: "Profil", icon: "user" },
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];

export function activeNavIndex(pathname: string): number {
  return NAV_ITEMS.findIndex((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
}
