import {
  BadgeCheck,
  Bell,
  CalendarDays,
  CreditCard,
  Dumbbell,
  FileText,
  LayoutDashboard,
  MapPin,
  Package,
  RotateCcw,
  Shield,
  Users,
} from "lucide-react";

export const ROUTE_GROUPS = ["Workspace", "Operations", "Insights"];

export const PUBLIC_ROUTES = [
  { path: "/login", label: "Login" },
  { path: "/register", label: "Register" },
];

const memberAndCoachRoles = ["member", "coach", "manager"];
const managerAndFinanceRoles = ["manager", "finance"];
const allRoles = ["member", "coach", "manager", "finance"];
const managerOnly = ["manager"];

export const APP_ROUTES = [
  {
    path: "/dashboard",
    label: "Dashboard",
    group: "Workspace",
    icon: LayoutDashboard,
    allowedRoles: ["member", "coach", "manager", "finance"],
    readOnlyRoles: ["finance"],
  },
  {
    path: "/membership-plans",
    label: "Membership plans",
    group: "Workspace",
    icon: BadgeCheck,
    allowedRoles: memberAndCoachRoles,
    readOnlyRoles: ["member", "coach"],
    manageRoles: managerOnly,
  },
  {
    path: "/memberships",
    label: "Memberships",
    group: "Workspace",
    icon: Users,
    allowedRoles: memberAndCoachRoles,
    readOnlyRoles: [],
    manageRoles: managerOnly,
  },
  {
    path: "/bookings",
    label: "Bookings",
    group: "Workspace",
    icon: CalendarDays,
    allowedRoles: memberAndCoachRoles,
    readOnlyRoles: [],
    manageRoles: managerOnly,
  },
  {
    path: "/facilities",
    label: "Facilities",
    group: "Workspace",
    icon: MapPin,
    allowedRoles: memberAndCoachRoles,
    readOnlyRoles: ["member", "coach"],
    manageRoles: managerOnly,
  },
  {
    path: "/equipment",
    label: "Equipment",
    group: "Operations",
    icon: Dumbbell,
    allowedRoles: memberAndCoachRoles,
    readOnlyRoles: ["member", "coach"],
    manageRoles: managerOnly,
  },
  {
    path: "/equipment-loans",
    label: "Equipment loans",
    group: "Operations",
    icon: Package,
    allowedRoles: memberAndCoachRoles,
    readOnlyRoles: ["member", "coach"],
    manageRoles: managerOnly,
  },
  {
    path: "/payments",
    label: "Payments",
    group: "Operations",
    icon: CreditCard,
    allowedRoles: allRoles,
    readOnlyRoles: ["finance"],
    manageRoles: ["manager"],
    initiateRoles: memberAndCoachRoles,
  },
  {
    path: "/refunds",
    label: "Refunds",
    group: "Operations",
    icon: RotateCcw,
    allowedRoles: allRoles,
    readOnlyRoles: ["member", "coach", "finance"],
    manageRoles: managerOnly,
  },
  {
    path: "/notifications",
    label: "Notifications",
    group: "Insights",
    icon: Bell,
    allowedRoles: ["member", "manager"],
    readOnlyRoles: [],
    manageRoles: managerOnly,
  },
  {
    path: "/reports",
    label: "Reports",
    group: "Insights",
    icon: FileText,
    allowedRoles: managerAndFinanceRoles,
    readOnlyRoles: managerAndFinanceRoles,
  },
  {
    path: "/audit-logs",
    label: "Audit logs",
    group: "Insights",
    icon: Shield,
    allowedRoles: managerAndFinanceRoles,
    readOnlyRoles: managerAndFinanceRoles,
  },
];
