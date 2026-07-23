"use client";

import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BellIcon } from "./icons";
import { apiGet, apiPatch } from "@/lib/api/client";

type AdminNotification = {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  order: { id: number; order_number: string; status: string } | null;
};
type Paginated<T> = { results: T[] };

export function Notification() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const isMobile = useIsMobile();
  const unread = notifications.filter((item) => !item.is_read).length;

  useEffect(() => {
    apiGet<Paginated<AdminNotification>>("/storefront/notifications/?state=pending")
      .then((data) => setNotifications(data.results.filter((item) => item.order).slice(0, 6)))
      .catch(() => setNotifications([]));
  }, []);

  async function markRead(item: AdminNotification) {
    if (!item.is_read) {
      try {
        const updated = await apiPatch<AdminNotification>(`/storefront/notifications/${item.id}/read/`, {});
        setNotifications((current) => current.map((next) => next.id === updated.id ? updated : next));
      } catch {}
    }
    setIsOpen(false);
  }

  return (
    <Dropdown
      isOpen={isOpen}
      setIsOpen={(open) => {
        setIsOpen(open);
      }}
    >
      <DropdownTrigger
        className="grid size-12 cursor-pointer place-items-center rounded-full border bg-gray-2 text-dark outline-none hover:text-primary focus-visible:border-primary focus-visible:text-primary dark:border-dark-4 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3 dark:focus-visible:border-primary"
        aria-label="View Notifications"
      >
        <span className="relative">
          <BellIcon />

          {unread > 0 && (
            <span
              className={cn(
                "absolute top-0 right-0 z-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-dark px-1 text-[10px] font-bold text-white ring-2 ring-gray-2 dark:bg-white dark:text-dark dark:ring-dark-3",
              )}
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </span>
      </DropdownTrigger>

      <DropdownContent
        align={isMobile ? "end" : "center"}
        className="border border-stroke bg-white px-3.5 py-3 shadow-md min-[350px]:min-w-[20rem] dark:border-dark-3 dark:bg-gray-dark"
      >
        <div className="mb-1 flex items-center justify-between px-2 py-1.5">
          <span className="text-lg font-medium text-dark dark:text-white">
            Notifications
          </span>
          <span className="text-xs font-medium text-dark-5 dark:text-dark-6">{unread} new</span>
        </div>

        <ul className="mb-3 max-h-92 space-y-1.5 overflow-y-auto">
          {notifications.map((item) => (
            <li key={item.id} role="menuitem">
              <Link
                href={item.order ? `/orders/${item.order.id}` : "/orders"}
                onClick={() => void markRead(item)}
                className="flex items-center gap-4 rounded-lg px-2 py-1.5 outline-none hover:bg-gray-2 focus-visible:bg-gray-2 dark:hover:bg-dark-3 dark:focus-visible:bg-dark-3"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-gray-2 text-dark dark:bg-dark-2 dark:text-white"><BellIcon /></span>

                <div>
                  <strong className="block text-sm font-medium text-dark dark:text-white">
                    {item.title}
                  </strong>

                  <span className="truncate text-sm font-medium text-dark-5 dark:text-dark-6">
                    {item.message}
                  </span>
                </div>
              </Link>
            </li>
          ))}
          {!notifications.length && <li className="px-2 py-6 text-center text-sm text-dark-5 dark:text-dark-6">No order notifications.</li>}
        </ul>

        <Link
          href="/orders"
          onClick={() => setIsOpen(false)}
          className="block rounded-lg border border-primary p-2 text-center text-sm font-medium tracking-wide text-primary transition-colors outline-none hover:bg-blue-light-5 focus:bg-blue-light-5 focus:text-primary focus-visible:border-primary dark:border-dark-3 dark:text-dark-6 dark:hover:border-dark-5 dark:hover:bg-dark-3 dark:hover:text-dark-7 dark:focus-visible:border-dark-5 dark:focus-visible:bg-dark-3 dark:focus-visible:text-dark-7"
        >
          See all notifications
        </Link>
      </DropdownContent>
    </Dropdown>
  );
}
