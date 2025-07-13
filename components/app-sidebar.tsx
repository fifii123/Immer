'use client';

import { useState } from 'react';
import { LogOut, Settings, User, GraduationCap, Sliders, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PreferencesDialog } from './preferences-dialog';
import { AlmaMaterDialog } from './alma-mater-dialog';
import { LanguageSettingsDialog } from './language-settings-dialog';
import { usePreferences } from '@/context/preferences-context';
import { useAuth } from '@/context/auth/AuthContext';
import { useTheme } from "@/hooks/use-theme"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

export function AppSidebar() {
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [almaMaterOpen, setAlmaMaterOpen] = useState(false);
  const [languageSettingsOpen, setLanguageSettingsOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const { darkMode, t } = usePreferences();
  const { user, logout } = useAuth();

  const menuItems = [
    {
      id: 'settings',
      icon: Settings,
      label: t('settings'),
      onClick: () => setLanguageSettingsOpen(true),
      color: 'from-blue-500 to-indigo-600',
    },
    {
      id: 'account',
      icon: User,
      label: t('account'),
      onClick: () => {},
      color: 'from-green-500 to-emerald-600',
    },
    {
      id: 'preferences',
      icon: Sliders,
      label: t('preferences'),
      onClick: () => setPreferencesOpen(true),
      color: 'from-purple-500 to-pink-600',
    },
    {
      id: 'almaMater',
      icon: GraduationCap,
      label: t('almaMater'),
      onClick: () => setAlmaMaterOpen(true),
      color: 'from-orange-500 to-red-600',
      badge: 'Demo',
    },
  ];

  return (
    <>
      <Sidebar className="border-r bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
        <SidebarHeader className="border-b bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 p-6">
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              <Avatar className="h-12 w-12 ring-2 ring-white dark:ring-gray-800 shadow-xl">
                <AvatarImage src="/placeholder.svg" />
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold">
                  {user ? user.name.slice(0, 2).toUpperCase() : 'NN'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
            </motion.div>
            <div className="flex flex-col">
              <span className="font-semibold text-gray-900 dark:text-white">
                {user ? user.name : 'Robin Hood'}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Premium Student
              </span>
            </div>
          </div>
        </SidebarHeader>
        
        <SidebarContent className="p-4">
          <SidebarMenu>
            {menuItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="w-full justify-start gap-3 px-3 py-2.5 rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-800 group"
                    onClick={item.onClick}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div className={`
                      p-2 rounded-lg transition-all duration-300
                      ${hoveredItem === item.id 
                        ? `bg-gradient-to-br ${item.color} shadow-lg` 
                        : 'bg-gray-100 dark:bg-gray-800'
                      }
                    `}>
                      <item.icon className={`
                        h-4 w-4 transition-colors
                        ${hoveredItem === item.id ? 'text-white' : 'text-gray-600 dark:text-gray-400'}
                      `} />
                    </div>
                    <span className="font-medium">{item.label}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="ml-auto">
                        {item.badge}
                      </Badge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </motion.div>
            ))}
          </SidebarMenu>
        </SidebarContent>
        
        <SidebarFooter className="p-4 border-t bg-gradient-to-t from-gray-50 to-transparent dark:from-gray-900/50">
          <div className="mb-4 p-4 rounded-lg bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
                Pro Tip
              </span>
            </div>
            <p className="text-xs text-indigo-700 dark:text-indigo-300">
              Use keyboard shortcuts to navigate faster. Press ⌘K to open command menu.
            </p>
          </div>
          
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                className="w-full justify-start gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all" 
                onClick={logout}
              >
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <LogOut className="h-4 w-4" />
                </div>
                <span className="font-medium">{t('logout')}</span>
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