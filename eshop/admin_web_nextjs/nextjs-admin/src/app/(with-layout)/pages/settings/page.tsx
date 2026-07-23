"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import { getCurrentUser, getStoredUser, type DjangoUser } from "@/lib/auth/django-auth-client";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";
import type { BrandStatus, SiteBranding } from "@/types/catalog";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const card = "rounded-[10px] bg-white p-7 shadow-1 dark:bg-gray-dark dark:shadow-card";
const input = "w-full rounded-lg border-[1.5px] border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white";
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Request failed.";

export default function SettingsPage() {
  const [tab, setTab] = useState<"account" | "branding" | "status">("account");
  const [user, setUser] = useState<DjangoUser | null>(null);
  const [branding, setBranding] = useState<SiteBranding | null>(null);
  const [statuses, setStatuses] = useState<BrandStatus[]>([]);
  useEffect(() => { setUser(getStoredUser()); getCurrentUser().then(setUser).catch(() => undefined); void loadBranding(); void loadStatuses(); }, []);
  async function loadBranding() { try { setBranding(await apiGet<SiteBranding>("/site/branding/")); } catch (error) { toast.error(errorMessage(error)); } }
  async function loadStatuses() { try { setStatuses(await apiGet<BrandStatus[]>("/site/statuses/")); } catch (error) { toast.error(errorMessage(error)); } }
  return <div className="mx-auto w-full max-w-270"><Breadcrumb pageName="Settings" /><div className="mb-6 flex gap-2"><Tab active={tab === "account"} onClick={() => setTab("account")}>Account</Tab><Tab active={tab === "branding"} onClick={() => setTab("branding")}>Branding</Tab><Tab active={tab === "status"} onClick={() => setTab("status")}>Logo Status</Tab></div>{tab === "account" ? <Account user={user} /> : null}{tab === "branding" && branding ? <BrandingForm branding={branding} onSaved={loadBranding} /> : null}{tab === "status" ? <StatusManager statuses={statuses} onChanged={loadStatuses} /> : null}</div>;
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" onClick={onClick} className={`rounded-[5px] px-4 py-2 font-medium ${active ? "bg-primary text-white" : "border border-stroke dark:border-dark-3"}`}>{children}</button>; }

function Account({ user }: { user: DjangoUser | null }) { return <section className={card}><h1 className="text-xl font-semibold text-dark dark:text-white">Account Settings</h1><dl className="mt-5 grid gap-3 sm:grid-cols-2"><div><dt className="text-sm text-gray-6">Username</dt><dd>{user?.username || "—"}</dd></div><div><dt className="text-sm text-gray-6">Email</dt><dd>{user?.email || "—"}</dd></div></dl></section>; }

function BrandingForm({ branding, onSaved }: { branding: SiteBranding; onSaved: () => Promise<void> }) {
  const [siteName, setSiteName] = useState(branding.site_name);
  const [alt, setAlt] = useState(branding.logo_alt_text);
  const [logo, setLogo] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const data = new FormData();
      data.set("site_name", siteName);
      data.set("logo_alt_text", alt);
      if (logo) data.set("logo", logo);
      await apiPatch("/site/branding/", data);
      toast.success("Branding saved.");
      await onSaved();
    } catch (error) { toast.error(errorMessage(error)); } finally { setSaving(false); }
  }
  const logoUrl = resolveMediaUrl(branding.logo_url);
  return <form onSubmit={submit} className={card}><h1 className="text-xl font-semibold text-dark dark:text-white">Branding</h1><div className="mt-5 grid gap-5 md:grid-cols-[160px_minmax(0,1fr)]"><div>{logoUrl ? <img src={logoUrl} alt={branding.logo_alt_text || branding.site_name} className="h-28 w-28 rounded-full border border-stroke object-contain p-2 dark:border-dark-3" /> : <div className="grid h-28 w-28 place-items-center rounded-full border border-stroke text-sm dark:border-dark-3">No logo</div>}</div><div className="space-y-4"><label className="block">Site name<input className={`${input} mt-2`} value={siteName} onChange={event => setSiteName(event.target.value)} /></label><label className="block">Logo alt text<input className={`${input} mt-2`} value={alt} onChange={event => setAlt(event.target.value)} /></label><label className="block">Upload / replace logo<input className={`${input} mt-2`} type="file" accept="image/png,image/jpeg,image/webp" onChange={event => setLogo(event.target.files?.[0] || null)} /></label><button disabled={saving} className="rounded-[5px] bg-primary px-6 py-3 font-medium text-white disabled:opacity-60">{saving ? "Saving…" : "Save branding"}</button></div></div></form>;
}

function StatusManager({ statuses, onChanged }: { statuses: BrandStatus[]; onChanged: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (!file) { toast.error("Choose status media."); return; }
    setSaving(true);
    try {
      const data = new FormData();
      data.set("media", file);
      data.set("caption", caption);
      data.set("is_active", "true");
      if (expiresAt) data.set("expires_at", new Date(expiresAt).toISOString());
      await apiPost("/site/statuses/", data);
      setFile(null); setCaption(""); setExpiresAt("");
      toast.success("Status published.");
      await onChanged();
    } catch (error) { toast.error(errorMessage(error)); } finally { setSaving(false); }
  }
  async function deactivate(status: BrandStatus) { try { await apiPatch(`/site/statuses/${status.id}/`, { is_active: false }); toast.success("Status deactivated."); await onChanged(); } catch (error) { toast.error(errorMessage(error)); } }
  async function remove(status: BrandStatus) { try { await apiDelete(`/site/statuses/${status.id}/`); toast.success("Status deleted."); await onChanged(); } catch (error) { toast.error(errorMessage(error)); } }
  return <section className={card}><h1 className="text-xl font-semibold text-dark dark:text-white">Logo Status</h1><form onSubmit={publish} className="mt-5 grid gap-4 md:grid-cols-2"><label className="block">Image or video<input className={`${input} mt-2`} type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/webm" onChange={event => setFile(event.target.files?.[0] || null)} /></label><label className="block">Expiry<input className={`${input} mt-2`} type="datetime-local" value={expiresAt} onChange={event => setExpiresAt(event.target.value)} /></label><label className="block md:col-span-2">Caption<input className={`${input} mt-2`} value={caption} onChange={event => setCaption(event.target.value)} /></label><button disabled={saving} className="w-fit rounded-[5px] bg-primary px-6 py-3 font-medium text-white disabled:opacity-60">{saving ? "Publishing…" : "Publish status"}</button></form><div className="mt-8 grid gap-4 md:grid-cols-3">{statuses.map(status => <article key={status.id} className="rounded-lg border border-stroke p-3 dark:border-dark-3"><StatusPreview status={status} /><p className="mt-2 text-sm font-medium">{status.caption || "No caption"}</p><p className="text-xs text-gray-6">{status.is_active ? "Active" : "Inactive"} · expires {status.expires_at ? new Date(status.expires_at).toLocaleString() : "after 24 hours"}</p><div className="mt-3 flex gap-3 text-sm"><button className="text-primary hover:underline" onClick={() => void deactivate(status)}>Deactivate</button><button className="text-red hover:underline" onClick={() => void remove(status)}>Delete</button></div></article>)}{!statuses.length ? <p className="text-sm text-gray-6">No statuses yet.</p> : null}</div></section>;
}

function StatusPreview({ status }: { status: BrandStatus }) {
  const mediaUrl = resolveMediaUrl(status.media_url || status.media);
  if (!mediaUrl) return <div className="grid h-32 place-items-center rounded bg-gray-2 text-sm dark:bg-dark-2">No preview</div>;
  return status.media_type === "video" ? <video src={mediaUrl} className="h-32 w-full rounded object-cover" controls /> : <img src={mediaUrl} alt={status.caption || "Logo status"} className="h-32 w-full rounded object-cover" />;
}
