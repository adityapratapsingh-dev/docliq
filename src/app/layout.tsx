import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CliqProvider } from "@/components/CliqProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cliq — Find Your Cliq",
  description:
    "Cliq is where teens share videos, photos and thoughts, upgrade the best posts, and find friends who match their vibe. Find your Cliq. Share your vibe.",
  applicationName: "Cliq",
  keywords: ["Cliq", "teen social app", "share videos", "make friends", "social feed"],
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-dvh bg-zinc-950 antialiased`}>
        <CliqProvider>{children}</CliqProvider>
      </body>
    </html>
  );
}
