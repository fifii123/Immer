"use client"

import { FileText, Plus, Sparkles, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { usePreferences } from "@/context/preferences-context"
import { motion } from "framer-motion"
import { useTheme } from "@/hooks/use-theme"

export default function ActionButtons() {
  const router = useRouter()
  const { t, darkMode } = usePreferences()
  const theme = useTheme()
  
  const buttons = [
    {
      icon: Plus,
      label: t("newProject"),
      description: "Start a new learning journey",
      gradient: theme.getPrimaryClass(),
      shadow: theme.getShadowClass(),
      hoverShadow: theme.getHoverShadowClass(),
      onClick: () => router.push("/create-project")
    },
    {
      icon: Sparkles,
      label: t("quickStudy"),
      description: "Turn your material into instant study power",
      gradient: theme.getPrimaryClass(),
      shadow: theme.getShadowClass(),
      hoverShadow: theme.getHoverShadowClass(),
      onClick: () => router.push("/quick-study")
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto bg-transparent">
      {buttons.map((button, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          whileHover={{ scale: 1.02, y: -4 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            variant="outline"
            className={`
              w-full h-auto p-6 group transition-all duration-500 hover:shadow-2xl backdrop-blur-md border-2 relative overflow-hidden rounded-2xl
              ${darkMode 
                ? `bg-black/5 border-gray-600/40 hover:border-gray-500/60 hover:bg-black/8 ${button.hoverShadow}/25` 
                : `bg-white/5 border-gray-300/50 hover:border-gray-400/70 hover:bg-white/8 ${button.hoverShadow}/20`
              }
            `}
            onClick={button.onClick}
          >
            {/* Subtle glass reflection */}
            <div className={`
              absolute inset-0 rounded-2xl transition-opacity duration-500 opacity-30 group-hover:opacity-50
              ${darkMode 
                ? 'bg-gradient-to-br from-white/5 via-white/2 to-transparent' 
                : 'bg-gradient-to-br from-white/15 via-white/8 to-transparent'
              }
            `} />
            
            <div className="flex flex-col items-center space-y-3 relative z-10">
              <div className={`
                p-3 rounded-2xl ${button.gradient} backdrop-blur-sm shadow-2xl ${button.shadow} transition-all duration-500 group-hover:scale-110 group-hover:-translate-y-1 group-hover:shadow-xl relative overflow-hidden
              `}>
                {/* Icon gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-white/10 rounded-2xl" />
                <button.icon className="h-8 w-8 text-white drop-shadow-sm relative z-10" />
              </div>
              <div className="text-center space-y-1">
                <p className={`font-semibold text-lg transition-colors duration-300 ${
                  darkMode ? 'text-white group-hover:text-white' : 'text-gray-900 group-hover:text-gray-800'
                }`}>
                  {button.label}
                </p>
                <p className={`text-sm transition-colors duration-300 ${
                  darkMode ? 'text-gray-300 group-hover:text-gray-200' : 'text-gray-600 group-hover:text-gray-500'
                }`}>
                  {button.description}
                </p>
              </div>
            </div>
          </Button>
        </motion.div>
      ))}
    </div>
  )
}