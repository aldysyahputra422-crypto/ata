import {
  Atom,
  BriefcaseBusiness,
  Camera,
  Clapperboard,
  CodeXml,
  Feather,
  FileText,
  FlaskConical,
  Image as ImageIcon,
  Mic,
  PenTool,
  Sparkles,
} from "lucide-react";
import type { CategoryCode } from "@/lib/categories";

// TODO(design): temporary Lucide glyphs; replace with designer stickers before public launch.
const ICONS: Record<CategoryCode, React.ReactNode> = {
  business_plan: <BriefcaseBusiness aria-hidden="true" />,
  pkm: <FlaskConical aria-hidden="true" />,
  kti_essay: <FileText aria-hidden="true" />,
  olympiad: <Atom aria-hidden="true" />,
  hackathon: <CodeXml aria-hidden="true" />,
  poster: <ImageIcon aria-hidden="true" />,
  design: <PenTool aria-hidden="true" />,
  photo: <Camera aria-hidden="true" />,
  creative_writing: <Feather aria-hidden="true" />,
  video: <Clapperboard aria-hidden="true" />,
  speech: <Mic aria-hidden="true" />,
  other: <Sparkles aria-hidden="true" />,
};

export function categoryIcon(code: CategoryCode) {
  return ICONS[code];
}
