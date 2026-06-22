"use client";

import { useEffect, useState } from "react";

type Props = { open: boolean; onClose: () => void; url?: string | null; title: string; fileName?: string; fileExtension?: string };

export function DocumentPreviewModal({ open, onClose, url, title, fileName, fileExtension }: Props) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open, url]);

  if (!open) return null;
  const extension = (fileExtension || url?.split("?")[0].split(".").pop() || "").toLowerCase();
  const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension);
  const isPdf = extension === "pdf";
  const isVideo = ["mp4", "webm", "mov", "ogg"].includes(extension);

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={`Preview ${title}`} onMouseDown={onClose}>
    <section className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-xl bg-white shadow-2xl dark:bg-gray-dark" onMouseDown={event => event.stopPropagation()}>
      <header className="flex items-center justify-between gap-4 border-b border-stroke p-4 dark:border-dark-3"><div className="min-w-0"><h2 className="truncate text-lg font-semibold text-dark dark:text-white">{title}</h2><p className="truncate text-xs text-body-color">{fileName || "Document preview"}</p></div><button type="button" onClick={onClose} className="rounded p-2 text-lg hover:bg-gray-1 dark:hover:bg-dark-2" aria-label="Close preview">×</button></header>
      <div className="relative min-h-64 overflow-auto p-4">{!url ? <Fallback title={title} extension={extension} /> : <>
        {loading && <p className="absolute inset-x-0 top-6 text-center text-sm">Loading preview…</p>}
        {isImage && <img src={url} alt={title} className="mx-auto max-h-[70vh] max-w-full rounded object-contain" onLoad={() => setLoading(false)} onError={() => setLoading(false)} />}
        {isPdf && <iframe src={url} title={title} className="h-[70vh] w-full rounded border-0" onLoad={() => setLoading(false)} />}
        {isVideo && <video src={url} controls className="mx-auto max-h-[70vh] w-full rounded" onLoadedData={() => setLoading(false)} onError={() => setLoading(false)}>Your browser cannot play this video.</video>}
        {!isImage && !isPdf && !isVideo && <Fallback title={title} extension={extension} url={url} />}
      </>}</div>
    </section>
  </div>;
}

function Fallback({ title, extension, url }: { title: string; extension: string; url?: string }) {
  return <div className="mx-auto max-w-md rounded-lg border border-stroke p-6 text-center dark:border-dark-3"><p className="font-medium text-dark dark:text-white">Preview is not available for this file type.</p><p className="mt-2 text-sm">{title}{extension ? ` (.${extension})` : ""}</p>{url && <a href={url} target="_blank" rel="noreferrer" className="mt-4 inline-block rounded bg-primary px-4 py-2 text-sm font-medium text-white">Open / download file</a>}</div>;
}
