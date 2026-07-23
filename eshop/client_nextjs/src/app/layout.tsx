import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { Toaster } from "sonner";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth/session";
import { Shell } from "@/components/layout/Shell";

const geist = localFont({
  src: "../../node_modules/next/dist/next-devtools/server/font/geist-latin.woff2",
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Storefront", template: "%s | Storefront" },
  description: "Responsive customer ecommerce storefront",
  manifest: "/manifest.webmanifest",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"),
  openGraph: { siteName: "Storefront", type: "website" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={geist.variable}>
        <Shell user={user}>{children}</Shell>
        <Toaster position="top-center" toastOptions={{ className: "border border-[var(--color-border-strong)] bg-white text-[var(--color-text)] shadow-none" }} />
        <Script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
