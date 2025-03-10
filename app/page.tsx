
import React from 'react';
import { useAuth } from '../context/auth/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import ActionButtons from '@/components/action-buttons';
import ProjectList from '@/components/project-list';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import WelcomeHeader from '@/components/welcome-header';
import DashboardSidebar from '@/components/dashboard-sidebar';


const DashboardPage = () => {

  return (
    <ProtectedRoute> {/* Chronimy dostęp do tej strony */}
      <SidebarProvider>
        <div className="flex min-h-screen bg-background text-foreground">
          <AppSidebar />
          <SidebarInset>
            <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 w-full">
              <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8">
                {/* Main Content */}
                <div className="flex-1 flex flex-col gap-6 lg:max-w-[calc(100%-24rem)] xl:max-w-[calc(100%-26rem)]">
                  {/* Welcome and Action Buttons Container */}
                  <div className="flex flex-col items-center w-full mb-8">
                    {/* Logo and Welcome */}
                    <div className="max-w-xl w-full flex flex-col items-center">
                      <WelcomeHeader />
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-6">
                      <ActionButtons />
                    </div>
                  </div>

                  {/* Projects Section */}
                  <ProjectList />
                </div>

                {/* Dashboard Sidebar */}
                <DashboardSidebar />
              </div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
};

export default DashboardPage;
