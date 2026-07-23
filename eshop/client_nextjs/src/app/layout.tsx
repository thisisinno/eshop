import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Toaster } from "sonner";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth/session";
import { Shell } from "@/components/layout/Shell";

export const metadata: Metadata = {
  title: { default: "eShop", template: "%s | eShop" },
  description: "Responsive customer ecommerce storefront",
  manifest: "/manifest.webmanifest",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"),
  openGraph: { siteName: "eShop", type: "website" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#5b2cff" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="en">
      <body>
        <Shell user={user}>{children}</Shell>
        <Toaster richColors position="top-center" />
        <Script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js" strategy="lazyOnload" />
      </body>
    </html>
  );
}
