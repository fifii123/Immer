import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PreferencesProvider } from "@/context/preferences-context";
import { AuthProvider } from "@/context/auth/AuthContext";
import { ProjectsProvider } from "@/context/projects-context";
import { Toaster } from "@/components/ui/toaster";
import ProtectedRoute from "@/components/ProtectedRoute"; // Importuj zabezpieczenie

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Simple UI",
  description: "A simple UI with sidebar and preferences",
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
        <AuthProvider>
          <PreferencesProvider>
            <ProjectsProvider>
              <ProtectedRoute>
                {children}
              </ProtectedRoute>
              <Toaster />
            </ProjectsProvider>
          </PreferencesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
