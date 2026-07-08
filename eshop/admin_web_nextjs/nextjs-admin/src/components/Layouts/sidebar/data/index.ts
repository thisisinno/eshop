import * as Icons from "../icons";

export const NAV_DATA = [
  {
    label: "MAIN MENU",
    items: [
      { title: "Dashboard", icon: Icons.HomeIcon, items: [{ title: "Overview", url: "/" }] },
    ],
  },
  {
    label: "REGISTRATION",
    items: [
      {
        title: "Traders / Companies",
        icon: Icons.User,
        items: [
          { title: "All Traders", url: "/registration/traders" },
          { title: "Agreements", url: "/registration/agreements" },
          { title: "Documents", url: "/registration/documents" },
          { title: "Branches", url: "/registration/branches" },
        ],
      },
    ],
  },
  {
    label: "ACCESS CONTROL",
    items: [
      {
        title: "User Management",
        icon: Icons.Authentication,
        items: [
          { title: "Users", url: "/user-management/users" },
          { title: "Roles", url: "/user-management/roles" },
          { title: "Permissions", url: "/user-management/permissions" },
        ],
      },
    ],
  },
  {
    label: "CATALOG",
    items: [
      {
        title: "Product Management",
        icon: Icons.Table,
        items: [
          { title: "Products", url: "/catalog/products" },
          { title: "Categories", url: "/catalog/categories" },
        ],
      },
    ],
  },
  {
    label: "ORDERS",
    items: [
      {
        title: "Orders",
        icon: Icons.Calendar,
        items: [{ title: "All Orders", url: "/orders" }],
      },
    ],
  },
  {
    label: "LOGS",
    items: [
      {
        title: "Logs",
        icon: Icons.Table,
        items: [
          { title: "User Activity", url: "/logs/user-activity" },
          { title: "Admin Activity", url: "/logs/admin-activity" },
          { title: "System Logs", url: "/logs/system" },
        ],
      },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { title: "Settings", url: "/pages/settings", icon: Icons.Alphabet, items: [] },
      { title: "Profile", url: "/profile", icon: Icons.User, items: [] },
    ],
  },
];
