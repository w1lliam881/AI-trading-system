import { LayoutDashboard, Lightbulb, Globe2, Wallet, Bot, Settings } from "lucide-react";

export const NAV = [
  { href: "/", label: "Översikt", icon: LayoutDashboard, keys: "g o" },
  { href: "/ideer", label: "Idéer", icon: Lightbulb, keys: "g i" },
  { href: "/makro", label: "Världsläget", icon: Globe2, keys: "g m" },
  { href: "/portfolj", label: "Min portfölj", icon: Wallet, keys: "g p" },
  { href: "/bot", label: "Botten", icon: Bot, keys: "g b" },
  { href: "/installningar", label: "Inställningar", icon: Settings, keys: "" },
] as const;
