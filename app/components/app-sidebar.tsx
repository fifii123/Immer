'use client';

import { useState } from 'react';
import { LogOut, Settings, User, GraduationCap, Sliders } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PreferencesDialog } from './preferences-dialog';
import { AlmaMaterDialog } from './alma-mater-dialog';
import { LanguageSettingsDialog } from './language-settings-dialog';
import { usePreferences } from '@/context/preferences-context';
import { useAuth } from '@/context/auth/AuthContext'; // Importujesz useAuth hook
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

export function AppSidebar() {
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [almaMaterOpen, setAlmaMaterOpen] = useState(false);
  const [languageSettingsOpen, setLanguageSettingsOpen] = useState(false);
  const { darkMode, t } = usePreferences();

  // Pobierz dane użytkownika z kontekstu
  const { user } = useAuth();  // Zakładam, że user zawiera dane użytkownika, w tym 'name'

  return (
    <>
      <Sidebar className={`border-r ${darkMode ? 'bg-muted' : 'bg-[#f5f1eb]'}`}>
        <SidebarHeader className="border-b p-4">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src="/placeholder.svg" />
              <AvatarFallback>{user ? user.name.slice(0, 2).toUpperCase() : 'NN'}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              {/* Wyświetlanie imienia użytkownika */}
              <span className="font-medium">{user ? user.name : 'Robin Hood'}</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="w-full justify-start gap-2"
                onClick={() => setLanguageSettingsOpen(true)}
              >
                <Settings className="h-4 w-4" />
                {t('settings')}
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton className="w-full justify-start gap-2">
                <User className="h-4 w-4" />
                {t('account')}
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="w-full justify-start gap-2"
                onClick={() => setPreferencesOpen(true)}
              >
                <Sliders className="h-4 w-4" />
                {t('preferences')}
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="w-full justify-start gap-2"
                onClick={() => setAlmaMaterOpen(true)}
              >
                <GraduationCap className="h-4 w-4" />
                {t('almaMater')}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton className="w-full justify-start gap-2">
                <LogOut className="h-4 w-4" />
                {t('logout')}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <PreferencesDialog open={preferencesOpen} onOpenChange={setPreferencesOpen} />
      <AlmaMaterDialog open={almaMaterOpen} onOpenChange={setAlmaMaterOpen} />
      <LanguageSettingsDialog open={languageSettingsOpen} onOpenChange={setLanguageSettingsOpen} />
    </>
  );
}
