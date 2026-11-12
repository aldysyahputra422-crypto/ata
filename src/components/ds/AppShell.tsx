import { NavRail } from "./NavRail";
import { TabBar } from "./TabBar";

/** Responsive frame: floating tab bar under 1024 px, glass rail from 1024 px, optional context panel from 1280 px. */
export function AppShell({ children, context }: { children: React.ReactNode; context?: React.ReactNode }) {
  return (
    <div className="app-shell" data-context={context ? "open" : "closed"}>
      <NavRail />
      <main className="page">{children}</main>
      {context ? <aside className="context-panel">{context}</aside> : null}
      <TabBar />
    </div>
  );
}
