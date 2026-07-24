"use client";

import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api/client";
import { getCurrentUser, getStoredUser, type DjangoUser } from "@/lib/auth/django-auth-client";
import { resolveMediaUrl } from "@/lib/media/resolve-media-url";
import type { BrandStatus, BrandStatusViewer, SiteBranding } from "@/types/catalog";
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
  type DraftStatus = { id: string; file: File; previewUrl: string; caption: string; durationValue: string; durationUnit: "seconds" | "minutes"; error: string };
  const [drafts, setDrafts] = useState<DraftStatus[]>([]);
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [viewersFor, setViewersFor] = useState<number | null>(null);
  const [viewers, setViewers] = useState<BrandStatusViewer[]>([]);
  const [editing, setEditing] = useState<BrandStatus | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editDuration, setEditDuration] = useState("15");
  const allowed = new Set(["jpg", "jpeg", "png", "webp", "mp4", "webm"]);

  function durationSeconds(value: string, unit: "seconds" | "minutes") {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return 15;
    return Math.min(3600, Math.max(1, Math.round(unit === "minutes" ? parsed * 60 : parsed)));
  }

  function chooseFiles(files: FileList | null) {
    if (!files?.length) return;
    const next = Array.from(files).map((file, index) => {
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      return {
        id: `${file.name}-${file.lastModified}-${index}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        caption: "",
        durationValue: "15",
        durationUnit: "seconds" as const,
        error: allowed.has(extension) ? "" : `${file.name} is not a supported status format.`,
      };
    });
    setDrafts((current) => [...current, ...next]);
  }

  function updateDraft(id: string, patch: Partial<DraftStatus>) {
    setDrafts((current) => current.map((draft) => draft.id === id ? { ...draft, ...patch } : draft));
  }

  function removeDraft(id: string) {
    setDrafts((current) => {
      const removed = current.find((draft) => draft.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((draft) => draft.id !== id);
    });
  }

  function moveDraft(id: string, direction: -1 | 1) {
    setDrafts((current) => {
      const index = current.findIndex((draft) => draft.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (!drafts.length) { toast.error("Choose status media."); return; }
    setSaving(true);
    const failed = new Set<string>();
    let published = 0;
    try {
      for (const [index, draft] of drafts.entries()) {
        if (draft.error) { failed.add(draft.id); continue; }
        try {
          const data = new FormData();
          data.set("media", draft.file);
          data.set("caption", draft.caption);
          data.set("display_duration_seconds", String(durationSeconds(draft.durationValue, draft.durationUnit)));
          data.set("sort_order", String(index));
          data.set("is_active", "true");
          if (expiresAt) data.set("expires_at", new Date(expiresAt).toISOString());
          await apiPost("/site/statuses/", data);
          published += 1;
        } catch (error) {
          failed.add(draft.id);
          updateDraft(draft.id, { error: errorMessage(error) });
        }
      }
      setDrafts((current) => {
        const remaining = current.filter((draft) => failed.has(draft.id));
        current.filter((draft) => !failed.has(draft.id)).forEach((draft) => URL.revokeObjectURL(draft.previewUrl));
        return remaining;
      });
      if (published) toast.success(`${published} status${published === 1 ? "" : "es"} published.`);
      if (failed.size) toast.error(`${failed.size} status item${failed.size === 1 ? "" : "s"} need attention.`);
      if (!failed.size) setExpiresAt("");
      await onChanged();
    } catch (error) { toast.error(errorMessage(error)); } finally { setSaving(false); }
  }
  async function toggle(status: BrandStatus) { try { await apiPatch(`/site/statuses/${status.id}/`, { is_active: !status.is_active }); toast.success(status.is_active ? "Status deactivated." : "Status activated."); await onChanged(); } catch (error) { toast.error(errorMessage(error)); } }
  async function remove(status: BrandStatus) { try { await apiDelete(`/site/statuses/${status.id}/`); toast.success("Status deleted."); await onChanged(); } catch (error) { toast.error(errorMessage(error)); } }
  async function loadViewers(status: BrandStatus) {
    try {
      setViewersFor(status.id);
      setViewers(await apiGet<BrandStatusViewer[]>(`/site/statuses/${status.id}/viewers/`));
    } catch (error) { toast.error(errorMessage(error)); }
  }
  function startEdit(status: BrandStatus) {
    setEditing(status);
    setEditCaption(status.caption);
    setEditDuration(String(status.display_duration_seconds || 15));
  }
  async function saveEdit() {
    if (!editing) return;
    try {
      await apiPatch(`/site/statuses/${editing.id}/`, { caption: editCaption, display_duration_seconds: durationSeconds(editDuration, "seconds") });
      toast.success("Status updated.");
      setEditing(null);
      await onChanged();
    } catch (error) { toast.error(errorMessage(error)); }
  }
  return <section className={card}><h1 className="text-xl font-semibold text-dark dark:text-white">Logo Status</h1><form onSubmit={publish} className="mt-5 grid gap-4"><div className="grid gap-4 md:grid-cols-2"><label className="block">Images or videos<input className={`${input} mt-2`} multiple type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/webm" onChange={event => chooseFiles(event.target.files)} /></label><label className="block">Expiry<input className={`${input} mt-2`} type="datetime-local" value={expiresAt} onChange={event => setExpiresAt(event.target.value)} /></label></div>{drafts.length ? <div className="grid gap-3">{drafts.map((draft, index) => <article key={draft.id} className="grid gap-3 rounded-lg border border-stroke p-3 dark:border-dark-3 md:grid-cols-[120px_minmax(0,1fr)]"><DraftPreview draft={draft} /><div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="truncate text-sm font-medium">{draft.file.name}</p><div className="flex gap-2 text-xs"><button type="button" className="rounded border border-stroke px-2 py-1 dark:border-dark-3" onClick={() => moveDraft(draft.id, -1)} disabled={index === 0}>Up</button><button type="button" className="rounded border border-stroke px-2 py-1 dark:border-dark-3" onClick={() => moveDraft(draft.id, 1)} disabled={index === drafts.length - 1}>Down</button><button type="button" className="rounded border border-red px-2 py-1 text-red" onClick={() => removeDraft(draft.id)}>Remove</button></div></div><input className={input} placeholder="Caption" value={draft.caption} onChange={event => updateDraft(draft.id, { caption: event.target.value })} /><div className="grid grid-cols-[1fr_130px] gap-2"><input className={input} inputMode="numeric" value={draft.durationValue} onChange={event => updateDraft(draft.id, { durationValue: event.target.value })} /><select className={input} value={draft.durationUnit} onChange={event => updateDraft(draft.id, { durationUnit: event.target.value as "seconds" | "minutes" })}><option value="seconds">Seconds</option><option value="minutes">Minutes</option></select></div>{draft.error ? <p className="text-sm text-red">{draft.error}</p> : null}</div></article>)}</div> : null}<button disabled={saving || !drafts.length} className="w-fit rounded-[5px] bg-primary px-6 py-3 font-medium text-white disabled:opacity-60">{saving ? "Publishing…" : "Publish statuses"}</button></form><div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{statuses.map(status => <article key={status.id} className="rounded-lg border border-stroke p-3 dark:border-dark-3"><StatusPreview status={status} /><p className="mt-2 text-sm font-medium">{status.caption || "No caption"}</p><p className="mt-1 text-xs text-gray-6">{status.media_type} · {status.display_duration_seconds}s · {status.is_active ? "Active" : "Inactive"}</p><p className="mt-1 text-xs text-gray-6">Starts {new Date(status.starts_at).toLocaleString()} · expires {status.expires_at ? new Date(status.expires_at).toLocaleString() : "after 24 hours"}</p><p className="mt-1 text-xs text-gray-6">{status.viewer_count || 0} viewers · {status.total_views || 0} total views</p><p className="mt-1 text-xs text-gray-6">Created {new Date(status.created_at).toLocaleString()} · updated {new Date(status.updated_at).toLocaleString()}</p><div className="mt-3 flex flex-wrap gap-3 text-sm"><button className="text-primary hover:underline" onClick={() => void toggle(status)}>{status.is_active ? "Deactivate" : "Activate"}</button><button className="text-primary hover:underline" onClick={() => startEdit(status)}>Edit</button><button className="text-primary hover:underline" onClick={() => void loadViewers(status)}>View viewers</button><button className="text-red hover:underline" onClick={() => void remove(status)}>Delete</button></div></article>)}{!statuses.length ? <p className="text-sm text-gray-6">No statuses yet.</p> : null}</div>{editing ? <div className="fixed inset-0 z-[999] grid place-items-center bg-black/40 p-4"><div className="w-full max-w-lg rounded-lg bg-white p-5 dark:bg-gray-dark"><h2 className="text-lg font-semibold">Edit status</h2><label className="mt-4 block">Caption<input className={`${input} mt-2`} value={editCaption} onChange={event => setEditCaption(event.target.value)} /></label><label className="mt-4 block">Duration seconds<input className={`${input} mt-2`} inputMode="numeric" value={editDuration} onChange={event => setEditDuration(event.target.value)} /></label><div className="mt-5 flex gap-3"><button className="rounded-[5px] bg-primary px-5 py-2 font-medium text-white" onClick={() => void saveEdit()}>Save</button><button className="rounded-[5px] border border-stroke px-5 py-2" onClick={() => setEditing(null)}>Cancel</button></div></div></div> : null}{viewersFor ? <div className="fixed inset-0 z-[999] grid place-items-center bg-black/40 p-4"><div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-5 dark:bg-gray-dark"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Status viewers</h2><button onClick={() => setViewersFor(null)}>Close</button></div><div className="mt-4 divide-y divide-stroke dark:divide-dark-3">{viewers.map(viewer => <div key={viewer.id} className="py-3 text-sm"><p className="font-medium">{viewer.viewer_name}</p><p className="text-gray-6">{viewer.viewer_type} · {viewer.view_count} views · last {new Date(viewer.last_viewed_at).toLocaleString()}</p></div>)}{!viewers.length ? <p className="py-4 text-sm text-gray-6">No viewers yet.</p> : null}</div></div></div> : null}</section>;
}

function StatusPreview({ status }: { status: BrandStatus }) {
  const mediaUrl = resolveMediaUrl(status.media_url || status.media);
  if (!mediaUrl) return <div className="grid h-32 place-items-center rounded bg-gray-2 text-sm dark:bg-dark-2">No preview</div>;
  return status.media_type === "video" ? <video src={mediaUrl} className="h-32 w-full rounded object-cover" controls /> : <img src={mediaUrl} alt={status.caption || "Logo status"} className="h-32 w-full rounded object-cover" />;
}

function DraftPreview({ draft }: { draft: { previewUrl: string; file: File; caption: string } }) {
  if (draft.file.type.startsWith("video/")) return <video src={draft.previewUrl} className="h-28 w-full rounded object-cover" muted controls />;
  return <img src={draft.previewUrl} alt={draft.caption || draft.file.name} className="h-28 w-full rounded object-cover" />;
}
