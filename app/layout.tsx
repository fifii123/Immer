import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PreferencesProvider } from "@/context/preferences-context";
import { AuthProvider } from "@/context/auth/AuthContext"; // Zaimportuj AuthProvider
import { ProjectsProvider } from "@/context/projects-context"; // Zaimportuj ProjectsProvider
import { Toaster } from "@/components/ui/toaster";
import ProtectedRoute from "@/components/ProtectedRoute"; // Zaimportuj ProtectedRoute
// In app/layout.tsx or similar
import '../lib/pdf-worker';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Immer App",
  description: "Learn faster and better",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {/* Dodaj AuthProvider, PreferencesProvider i ProjectsProvider */}
        <AuthProvider>
          <PreferencesProvider>
            <ProjectsProvider>
              {/* Otocz aplikację komponentem ProtectedRoute */}
              {children}
              <Toaster />
            </ProjectsProvider>
          </PreferencesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
