import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";
import "./globals.css";
import { AppLayout } from "@/components/layout/app-layout";
import { auth } from "@/lib/auth";
import { DbKeepAliveClient } from "@/components/db-keepalive-client";

// Force dynamic rendering for layout with session checks
export const dynamic = 'force-dynamic';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Media Contacts DB",
  description: "Find contacts of journalists, bloggers and podcasters for your next media relations campaign",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Use auth() for consistent session handling
  let session;
  try {
    session = await auth();
  } catch (error) {
    // Handle errors gracefully during static generation/prerendering
    console.error('Error getting session:', error);
    session = null;
  }
  const isAuthenticated = !!session;
  
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers session={session}>
          {isAuthenticated ? (
            <AppLayout>{children}</AppLayout>
          ) : (
            children
          )}
          <Toaster richColors position="top-right" />
          <DbKeepAliveClient />
        </Providers>
      </body>
    </html>
  );
}
