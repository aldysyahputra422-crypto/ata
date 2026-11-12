import Image from "next/image";

export type MascotPose = "santai" | "mikir" | "rayakan" | "waspada" | "tidur";

/**
 * Empty state with the Ata mascot. The official mascot comes from Sobat Ambis and must not be
 * redrawn (DESIGN-SYSTEM 10). Until the files land in public/mascot/<pose>.png, a neutral
 * placeholder of the same size is shown so layouts do not shift later.
 */
export function EmptyState({
  title,
  text,
  action,
  pose = "santai",
  mascotSrc,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
  pose?: MascotPose;
  mascotSrc?: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state__mascot" data-pose={pose} style={mascotSrc ? { border: 0 } : undefined} aria-hidden="true">
        {mascotSrc ? <Image src={mascotSrc} alt="" width={112} height={112} /> : <span>Maskot Ata<br />({pose})</span>}
      </div>
      <p className="empty-state__title">{title}</p>
      <p className="empty-state__text">{text}</p>
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}
