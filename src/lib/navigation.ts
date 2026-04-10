import {
  BarChart3,
  BookOpen,
  ClipboardList,
  Flag,
  Gauge,
  ListChecks,
  Megaphone
} from "lucide-react";

export const navigationItems = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/courses", label: "Courses", icon: Flag },
  { href: "/runners", label: "Partants", icon: ListChecks },
  { href: "/predictions", label: "Pronostics", icon: BarChart3 },
  { href: "/results", label: "Résultats", icon: ClipboardList },
  { href: "/publications", label: "Publications", icon: Megaphone },
  { href: "/logs", label: "Logs", icon: BookOpen }
];

