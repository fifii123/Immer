"use client"

import { FileText, Plus, Sparkles, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { usePreferences } from "@/context/preferences-context"
import { motion } from "framer-motion"
import { useTheme } from "@/hooks/use-theme"

export default function ActionButtons() {
  const router = useRouter()
  const { t } = usePreferences()
  const theme = useTheme()
  const buttons = [
    {
      icon: Plus,
      label: t("newProject"),
      description: "Start a new learning journey",
      gradient: theme.getPrimaryClass(),
      shadow: theme.getShadowClass(),
      onClick: () => router.push("/create-project")
    },
    {
      icon: Sparkles,
      label: t("quickStudy"),
      description: "Turn your material into instant study power",
      gradient: theme.getPrimaryClass(),
      shadow: theme.getShadowClass(),
      onClick: () => router.push("/quick-study")
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto bg-transparent">
      {buttons.map((button, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
        >
          <Button
            variant="outline"
            className="w-full h-auto p-6 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 group transition-all duration-300 hover:shadow-xl"
            onClick={button.onClick}
          >
            <div className="flex flex-col items-center space-y-3">
            <div className={`p-3 rounded-2xl ${button.gradient} shadow-lg ${button.shadow} group-hover:shadow-xl transition-all duration-300 group-hover:scale-110`}>
  <button.icon className="h-8 w-8 text-white" />
</div>
              <div className="text-center space-y-1">
                <p className="font-semibold text-lg text-gray-900 dark:text-white">
                  {button.label}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
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