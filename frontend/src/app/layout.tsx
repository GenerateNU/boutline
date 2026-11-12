import type { Metadata } from "next";
import { Geist, Geist_Mono, Manrope, Special_Gothic_Expanded_One } from "next/font/google";
import localFont from "next/font/local";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import "./globals.css";

import { GlobalNav } from "@/components/primitives/global-nav";
import { Toaster } from "@/components/primitives/toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope-face",
  subsets: ["latin"],
});

const wordmark = Special_Gothic_Expanded_One({
  variable: "--font-wordmark-face",
  weight: "400",
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${satoshi.variable} ${manrope.variable} ${wordmark.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <Toaster>
            <GlobalNav />
            {children}
          </Toaster>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
