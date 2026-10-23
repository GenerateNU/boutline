import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

import { Toaster } from "@/components/primitives/toast";
import { getSessionToken } from "@/features/auth/services/session";
import { TopAppBar } from "@/features/navigation/components/top-app-bar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const satoshi = localFont({
  src: "./fonts/Satoshi-Variable.woff2",
  variable: "--font-satoshi-face",
});

export const metadata: Metadata = {
  title: "Boutline",
  description: "Redefining Fencing Tournaments",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const sessionToken = await getSessionToken();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${satoshi.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Toaster>
          <TopAppBar signedIn={Boolean(sessionToken)} />
          {children}
        </Toaster>
      </body>
    </html>
  );
}
