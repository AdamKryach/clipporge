import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { ToastProvider } from "@/components/toast";

export const metadata: Metadata = {
  title: "ClipForge — AI Video Clipping",
  description:
    "Upload a long video and let AI find your best moments. Auto-generate TikTok, Reels and Shorts clips with captions, titles and hashtags.",
};

export const viewport: Viewport = {
  themeColor: "#0a0f1e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <ToastProvider>{children}</ToastProvider>
        </Providers>
      </body>
    </html>
  );
}