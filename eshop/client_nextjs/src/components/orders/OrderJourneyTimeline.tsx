import type { OrderJourneyEvent } from "@/types/storefront";

const label = (value: string) => value.replaceAll("_", " ");

export function OrderJourneyTimeline({ events, hasChat }: { events: OrderJourneyEvent[]; hasChat: boolean }) {
  return (
    <section className="border-t border-[var(--color-border)]">
      <div className="border-b border-[var(--color-border)] px-4 py-3">
        <h2 className="font-black">Order journey</h2>
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">A read-only record of this order and its support conversation.</p>
      </div>
      <ol className="divide-y divide-[var(--color-border)]">
        {events.map((event) => {
          const message = event.event_type === "chat_message";
          return <li key={event.id} className="grid grid-cols-[14px_minmax(0,1fr)] gap-3 px-4 py-3">
            <span aria-hidden className={`mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-black ${message ? event.actor_role === "customer" ? "bg-black" : "bg-white" : "bg-[var(--color-primary-soft)]"}`} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className="text-sm font-black">{event.title}</h3>
                <time dateTime={event.created_at} className="text-[11px] text-[var(--color-text-secondary)]">{new Date(event.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</time>
              </div>
              {event.actor_name ? <p className="mt-0.5 text-xs font-semibold capitalize">{event.actor_name} · {label(event.actor_role || "")}</p> : null}
              {event.description ? <p className={`mt-1 whitespace-pre-wrap break-words text-sm leading-5 ${message ? "rounded-lg bg-[var(--color-primary-soft)] px-3 py-2" : "text-[var(--color-text-secondary)]"}`}>{event.description}</p> : null}
            </div>
          </li>;
        })}
      </ol>
      {!hasChat ? <p className="border-t border-[var(--color-border)] px-4 py-3 text-xs text-[var(--color-text-secondary)]">No support conversation was started for this order.</p> : null}
    </section>
  );
}
