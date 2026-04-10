import {
  AlarmClock,
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
  { href: "/results", label: "R�sultats", icon: ClipboardList },
  { href: "/publications", label: "Publications", icon: Megaphone },
  { href: "/scheduler", label: "Jobs", icon: AlarmClock },
  { href: "/logs", label: "Logs", icon: BookOpen }
];
