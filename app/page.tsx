'use client';

import React from 'react';
import { usePreferences } from '@/context/preferences-context';
import ProtectedRoute from '@/components/ProtectedRoute';
import ActionButtons from '@/components/action-buttons';
import ProjectList from '@/components/project-list';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import WelcomeHeader from '@/components/welcome-header';
import { useTheme } from '@/hooks/use-theme';

const DashboardPage = () => {
  const { getDashboardBackgroundClass, getDashboardBlurClass } = useTheme();
  const { darkMode } = usePreferences();

  // Definiujemy klasy dla light i dark mode (możesz dopasować do swojego useTheme)
  // Tu przykładowo, można dodać różne rozmycia i topy elementów.
  const blurClass = darkMode
    ? `${getDashboardBlurClass()} blur-[66px]`
    : `${getDashboardBlurClass()} blur-[200px]`;

  // Różne wartości topów i wysokości dla gradientów
  const topPosition = darkMode ? 'top-32' : 'top-112';
  const height = darkMode ? 'h-32' : 'h-52';

  return (
    <ProtectedRoute>
      <SidebarProvider>
        <div className={`flex min-h-screen ${getDashboardBackgroundClass()} text-foreground`}>
          <AppSidebar />
          <SidebarInset>
            <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 w-full">
              <div className="max-w-7xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="relative">
                  <div className={`absolute ${topPosition} left-0 right-0 ${height} ${blurClass}`} />
                  <div className="relative">
                    <WelcomeHeader />
                  </div>
                </div>

                {/* Main Content */}
                <div className="space-y-8">
                  {!darkMode && (
                    <div className={`absolute top-112 left-0 right-0 h-52 ${blurClass}`} />
                  )}
                  <ActionButtons />
                  <ProjectList />
                </div>
              </div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
};

export default DashboardPage;
