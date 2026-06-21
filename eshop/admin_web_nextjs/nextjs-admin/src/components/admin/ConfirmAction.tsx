"use client";
import type { ReactNode } from "react";
export function ConfirmAction({ label, message, onConfirm, className = "text-primary hover:underline" }: { label: ReactNode; message: string; onConfirm: () => void | Promise<void>; className?: string }) { return <button className={className} onClick={() => { if (window.confirm(message)) void onConfirm(); }}>{label}</button>; }
