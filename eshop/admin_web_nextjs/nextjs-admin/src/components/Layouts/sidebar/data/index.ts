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
    label: "SYSTEM",
    items: [
      { title: "Settings", url: "/pages/settings", icon: Icons.Alphabet, items: [] },
      { title: "Profile", url: "/profile", icon: Icons.User, items: [] },
    ],
  },
];
