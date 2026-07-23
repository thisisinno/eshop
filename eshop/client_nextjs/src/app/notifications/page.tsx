export default function NotificationsPage() {
  return (
    <section>
      <div className="sticky top-[58px] z-20 border-b border-[var(--color-border)] bg-white/95 px-4 py-4 backdrop-blur md:top-0">
        <h1 className="text-2xl font-black">Notifications</h1>
      </div>
      <div className="px-4 py-16 text-center">
        <h2 className="text-xl font-black">Nothing new yet.</h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Customer notifications will appear here when a backend notification API is available.</p>
      </div>
    </section>
  );
}
