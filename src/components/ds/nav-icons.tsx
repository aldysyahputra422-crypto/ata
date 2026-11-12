import { ChartNoAxesColumn, MessageCircle, Sun, Trophy, UserRound } from "lucide-react";
import type { NavItem } from "@/lib/nav";

const ICONS: Record<NavItem["icon"], React.ReactNode> = {
  sun: <Sun aria-hidden="true" />,
  trophy: <Trophy aria-hidden="true" />,
  message: <MessageCircle aria-hidden="true" />,
  chart: <ChartNoAxesColumn aria-hidden="true" />,
  user: <UserRound aria-hidden="true" />,
};

export function navIcon(name: NavItem["icon"]) {
  return ICONS[name];
}
