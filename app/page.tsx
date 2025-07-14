import React from 'react'; 
import { useAuth } from '../context/auth/AuthContext'; 
import ProtectedRoute from '@/components/ProtectedRoute'; 
import ActionButtons from '@/components/action-buttons'; 
import ProjectList from '@/components/project-list'; 
import { AppSidebar } from '@/components/app-sidebar'; 
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'; 
import WelcomeHeader from '@/components/welcome-header';

const DashboardPage = () => {    
  return (     
    <ProtectedRoute>
      <SidebarProvider>         
        <div className="flex min-h-screen bg-gradient-to-br from-purple-200 via-blue-100 via-indigo-100 to-violet-200 dark:from-slate-900 dark:via-purple-900 dark:via-indigo-900 dark:to-violet-900 text-foreground">           
          <AppSidebar />           
          <SidebarInset>             
            <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 w-full">               
              <div className="max-w-7xl mx-auto space-y-8">
                {/* Header Section */}
                <div className="relative">
                  <div className="absolute top-32 left-0 right-0 h-32 bg-gradient-to-r from-indigo-500/35 via-purple-500/40 via-pink-500/35 to-rose-500/35 blur-[66px]" />
                  <div className="relative">
                    <WelcomeHeader />
                  </div>
                </div>
                
                {/* Main Content */}
                <div className="space-y-8">
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