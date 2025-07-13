"use client"

import * as React from "react"
import { Save, Languages, Globe, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { usePreferences, type Language } from "@/context/preferences-context"
import { motion } from "framer-motion"

interface LanguageSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface LanguageOption {
  value: Language
  label: string
  nativeLabel: string
  flag: string
  description: string
}

const languageOptions: LanguageOption[] = [
  {
    value: "en",
    label: "English",
    nativeLabel: "English",
    flag: "🇺🇸",
    description: "Default language"
  },
  {
    value: "de",
    label: "German",
    nativeLabel: "Deutsch",
    flag: "🇩🇪",
    description: "Deutsche Sprache"
  },
  {
    value: "es",
    label: "Spanish",
    nativeLabel: "Español",
    flag: "🇪🇸",
    description: "Idioma español"
  },
  {
    value: "fr",
    label: "French",
    nativeLabel: "Français",
    flag: "🇫🇷",
    description: "Langue française"
  },
  {
    value: "pl",
    label: "Polish",
    nativeLabel: "Polski",
    flag: "🇵🇱",
    description: "Język polski"
  }
]

export function LanguageSettingsDialog({ open, onOpenChange }: LanguageSettingsDialogProps) {
  const { toast } = useToast()
  const { language, setLanguage, t, darkMode } = usePreferences()

  const [selectedLanguage, setSelectedLanguage] = React.useState<Language>(language)

  // Update selected language when the dialog opens or language changes
  React.useEffect(() => {
    if (open) {
      setSelectedLanguage(language)
    }
  }, [open, language])

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault()

    // Update global state
    setLanguage(selectedLanguage)

    toast({
      title: t("languageUpdated"),
      description: t("languagePreferenceSaved"),
    })
    onOpenChange(false)
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto border-0 bg-gradient-to-br from-white to-blue-50 dark:from-slate-900 dark:to-slate-800 shadow-2xl">
        <DialogHeader className="pb-6 border-b border-blue-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-3 mb-2">
            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg"
            >
              <Languages className="h-6 w-6 text-white" />
            </motion.div>
            <div className="flex-1">
              <DialogTitle className="font-bold text-2xl bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                {t("language")}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Select your preferred language
              </DialogDescription>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium">
              DEMO
            </Badge>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-6">
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-700 dark:text-gray-300">
                Available Languages
              </h3>
            </div>

            <RadioGroup
              value={selectedLanguage}
              onValueChange={(value) => setSelectedLanguage(value as Language)}
              className="space-y-2"
            >
              {languageOptions.map((option) => (
                <motion.div 
                  key={option.value}
           
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative flex items-center space-x-4 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    selectedLanguage === option.value
                      ? darkMode
                        ? 'border-blue-500 bg-blue-900/20 shadow-lg'
                        : 'border-blue-500 bg-blue-50 shadow-lg'
                      : darkMode
                        ? 'border-slate-700 hover:border-blue-400 hover:bg-slate-800/50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                  }`}
                >
                  <RadioGroupItem 
                    value={option.value} 
                    id={option.value}
                    className={selectedLanguage === option.value ? 'border-blue-500' : ''}
                  />
                  
                  <div className="text-2xl" role="img" aria-label={`${option.label} flag`}>
                    {option.flag}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <Label 
                      htmlFor={option.value} 
                      className="font-medium cursor-pointer text-base dark:text-white block"
                    >
                      {option.nativeLabel}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </div>
                  
                  {selectedLanguage === option.value && (
                    <motion.div
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      className={`p-1 rounded-full ${
                        darkMode ? 'bg-blue-500' : 'bg-blue-600'
                      }`}
                    >
                      <Check className="h-4 w-4 text-white" />
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </RadioGroup>

            {/* Language Info */}
            <motion.div 
         
              className={`p-4 rounded-xl border ${
                darkMode 
                  ? 'bg-slate-800/30 border-slate-700/50' 
                  : 'bg-blue-50/50 border-blue-200/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  darkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                }`}>
                  <Globe className={`h-4 w-4 ${
                    darkMode ? 'text-blue-400' : 'text-blue-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-sm mb-1 text-gray-900 dark:text-gray-100">
                    Language Settings
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Changing the language will update the interface for all menus, buttons, and text throughout the application. 
                    Some technical terms may remain in English for consistency.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>

          <DialogFooter className="pt-6 border-t border-blue-200/50 dark:border-slate-700/50">
            <div className="flex gap-3 w-full sm:w-auto">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="flex-1 sm:flex-none border-2 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                {t("cancel")}
              </Button>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-1 sm:flex-none"
              >
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  disabled={selectedLanguage === language}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {t("save")}
                </Button>
              </motion.div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}