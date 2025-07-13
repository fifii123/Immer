"use client"

import * as React from "react"
import { Save, Sliders, User, Eye, Palette, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { usePreferences, type GreetingType } from "@/context/preferences-context"
import { motion } from "framer-motion"
import { useTheme } from "@/hooks/use-theme"
import { HexColorPicker } from "react-colorful"
import { ColorSettings } from "@/context/preferences-context"

interface PreferencesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PreferencesDialog({ open, onOpenChange }: PreferencesDialogProps) {
  const { toast } = useToast()
  const {
    displayName,
    setDisplayName,
    menuDisplay,
    setMenuDisplay,
    darkMode,
    setDarkMode,
    greetingType,
    setGreetingType,
    refreshGreeting,
    t,
    colorSettings,
    setColorSettings,

  } = usePreferences()

  const theme = useTheme()

  const [formValues, setFormValues] = React.useState({
    displayName: displayName,
    menuDisplay: menuDisplay,
    darkMode: darkMode,
    greetingType: greetingType,
    colorSettings: colorSettings
  })

  // Update form values when context changes or dialog opens
  React.useEffect(() => {
    if (open) {
      setFormValues({
        displayName,
        menuDisplay,
        darkMode,
        greetingType,
        colorSettings
      })
    }
  }, [open, displayName, menuDisplay, darkMode, greetingType])

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault()

    // Update global state
    setDisplayName(formValues.displayName)
    setMenuDisplay(formValues.menuDisplay)
    setDarkMode(formValues.darkMode)
    setGreetingType(formValues.greetingType as GreetingType)
    setColorSettings(formValues.colorSettings)
    // Refresh greeting if it's alternating
    if (formValues.greetingType === 'alternating') {
      refreshGreeting()
    }

    toast({
      title: t("preferencesUpdated"),
      description: t("preferencesUpdatedDescription"),
    })
    onOpenChange(false)
  }

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto border-0 bg-gradient-to-br from-white to-gray-50 dark:from-slate-900 dark:to-slate-800 shadow-2xl">
        <DialogHeader className="pb-6 border-b border-gray-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-3 mb-2">
            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg"
            >
              <Sliders className="h-6 w-6 text-white" />
            </motion.div>
            <div className="flex-1">
              <DialogTitle className="font-bold text-2xl bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                {t("preferences")}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                {t("customizeAppearanceAndBehavior") || "Customize your app appearance and behavior"}
              </DialogDescription>
            </div>
            <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 font-medium">
              DEMO
            </Badge>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-6">
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Personal Section */}
            <motion.div variants={itemVariants} className={`space-y-4 p-4 rounded-xl border ${
              darkMode 
                ? 'bg-slate-800/30 border-slate-700/50' 
                : 'bg-gray-50/50 border-gray-200/50'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-700 dark:text-gray-300">
                  {t("personalSettings")}
                </h3>
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="displayName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("displayName")}
                </Label>
                <Input
                  id="displayName"
                  value={formValues.displayName}
                  onChange={(e) =>
                    setFormValues((prev) => ({
                      ...prev,
                      displayName: e.target.value,
                    }))
                  }
                  placeholder={t("enterYourName")}
                  className="transition-all duration-200 border-2 focus:border-purple-500 focus:ring-purple-500/20 dark:bg-slate-800/50 dark:text-white dark:border-slate-600 dark:focus:border-purple-400 rounded-lg backdrop-blur-sm"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="greetingType" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("greetingStyle")}
                </Label>
                <Select
                  value={formValues.greetingType}
                  onValueChange={(value) =>
                    setFormValues((prev) => ({
                      ...prev,
                      greetingType: value as GreetingType,
                    }))
                  }
                >
                  <SelectTrigger
                    id="greetingType"
                    className="w-full border-2 focus:border-purple-500 focus:ring-purple-500/20 dark:bg-slate-800/50 dark:text-white dark:border-slate-600 dark:focus:border-purple-400 rounded-lg transition-all"
                  >
                    <SelectValue placeholder={t("chooseGreetingStyle")} />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:text-white dark:border-slate-700">
                    <SelectItem value="welcome">{t("welcomeBack")}</SelectItem>
                    <SelectItem value="hello">{t("hello")}</SelectItem>
                    <SelectItem value="goodToSeeYou">{t("goodToSeeYou")}</SelectItem>
                    <SelectItem value="greetings">{t("greetings")}</SelectItem>
                    <SelectItem value="howdy">{t("howdy")}</SelectItem>
                    <SelectItem value="heyThere">{t("heyThere")}</SelectItem>
                    <SelectItem value="alternating">{t("alternating")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>

            {/* Interface Section */}
            <motion.div variants={itemVariants} className={`space-y-4 p-4 rounded-xl border ${
              darkMode 
                ? 'bg-slate-800/30 border-slate-700/50' 
                : 'bg-gray-50/50 border-gray-200/50'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-700 dark:text-gray-300">
                  {t("interfaceSettings")}
                </h3>
              </div>

              <div className="space-y-3">
                <Label htmlFor="menuDisplay" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("mainMenuDisplay")}
                </Label>
                <Select
                  value={formValues.menuDisplay}
                  onValueChange={(value) =>
                    setFormValues((prev) => ({
                      ...prev,
                      menuDisplay: value,
                    }))
                  }
                >
                  <SelectTrigger
                    id="menuDisplay"
                    className="w-full border-2 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-800/50 dark:text-white dark:border-slate-600 dark:focus:border-blue-400 rounded-lg transition-all"
                  >
                    <SelectValue placeholder={t("chooseOption")} />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:text-white dark:border-slate-700">
                    <SelectItem value="default">{t("allProjects")}</SelectItem>
                    <SelectItem value="subjects">{t("subjects")}</SelectItem>
                    <SelectItem value="catalogs">{t("catalogs")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>

            {/* Appearance Section */}
            <motion.div variants={itemVariants} className={`space-y-4 p-4 rounded-xl border ${
              darkMode 
                ? 'bg-slate-800/30 border-slate-700/50' 
                : 'bg-gray-50/50 border-gray-200/50'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <Palette className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-700 dark:text-gray-300">
                  {t("appearanceSettings")}
                </h3>
              </div>

              <div className={`rounded-xl border p-4 space-y-4 transition-all ${
                darkMode 
                  ? 'border-slate-700/50 bg-slate-900/30' 
                  : 'border-gray-200/50 bg-white/50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="darkMode" className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("darkMode")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("darkModeDescription") || "Switch between light and dark themes"}
                    </p>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Switch
                      id="darkMode"
                      checked={formValues.darkMode}
                      onCheckedChange={(checked) =>
                        setFormValues((prev) => ({
                          ...prev,
                          darkMode: checked,
                        }))
                      }
                      className="data-[state=checked]:bg-purple-600"
                    />
                  </motion.div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="notifications" className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("emailNotifications")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("emailNotificationsDescription") || "Receive updates via email"}
                    </p>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Switch 
                      id="notifications" 
                      defaultChecked
                      className="data-[state=checked]:bg-orange-600"
                    />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </motion.div>
{/* Theme Selection */}
<div className="space-y-3">
  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
    Color Scheme
  </Label>
  
  <div className="grid grid-cols-2 gap-3">
    {[
      { id: "indigo-purple", name: "Classic", desc: "Indigo & Purple", colors: ["bg-indigo-500", "bg-purple-600"] },
      { id: "blue-cyan", name: "Ocean", desc: "Blue & Cyan", colors: ["bg-blue-500", "bg-cyan-500"] },
      { id: "green-emerald", name: "Nature", desc: "Green & Emerald", colors: ["bg-green-500", "bg-emerald-500"] },
      { id: "pink-rose", name: "Romantic", desc: "Pink & Rose", colors: ["bg-pink-500", "bg-rose-500"] },
      { id: "orange-red", name: "Sunset", desc: "Orange & Red", colors: ["bg-orange-500", "bg-red-500"] },
      { id: "teal-navy", name: "Navy Pro", desc: "Teal & Navy", colors: ["bg-teal-600", "bg-blue-800"] }
    ].map((themeOption) => (
      <motion.button
        key={themeOption.id}
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setFormValues(prev => ({ 
          ...prev, 
          colorSettings: { ...prev.colorSettings, theme: themeOption.id as any }
        }))}
        className={`p-3 rounded-lg border-2 transition-all text-left ${
          formValues.colorSettings.theme === themeOption.id
            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
            : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {themeOption.name}
          </div>
          <div className="flex gap-1">
            <div className={`w-3 h-3 rounded-full ${themeOption.colors[0]}`}></div>
            <div className={`w-3 h-3 rounded-full ${themeOption.colors[1]}`}></div>
          </div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {themeOption.desc}
        </div>
      </motion.button>
    ))}
  </div>
</div>

{/* Professional Themes Section */}
<div className="space-y-3">
  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
    Professional Themes
  </Label>
  
  <div className="grid grid-cols-1 gap-2">
    <motion.button
      type="button"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => setFormValues(prev => ({ 
        ...prev, 
        colorSettings: { ...prev.colorSettings, theme: "slate-professional" }
      }))}
      className={`p-3 rounded-lg border-2 transition-all text-left ${
        formValues.colorSettings.theme === "slate-professional"
          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
          : 'border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Minimal Professional
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Clean slate tones for serious work
          </div>
        </div>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-full bg-slate-600"></div>
          <div className="w-3 h-3 rounded-full bg-slate-700"></div>
        </div>
      </div>
    </motion.button>
  </div>
</div>
 {/* Gradient Toggle */}
 <div className="flex items-center justify-between">
    <div className="space-y-1">
      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Use Gradients
      </Label>
      <p className="text-xs text-muted-foreground">
        Toggle between gradients and solid colors
      </p>
    </div>
    <Switch
      checked={formValues.colorSettings.useGradients}
      onCheckedChange={(checked) =>
        setFormValues((prev) => ({
          ...prev,
          colorSettings: { ...prev.colorSettings, useGradients: checked }
        }))
      }
    />
  </div>
{/* Live Preview */}
<div className="mt-4 p-4 rounded-lg border border-gray-200 dark:border-slate-600">
  <div className="text-xs text-muted-foreground mb-2">Live Preview:</div>
  <div className="flex items-center gap-2">
    <div className={`px-3 py-1 rounded text-white text-sm transition-all ${
      formValues.colorSettings.useGradients 
        ? formValues.colorSettings.theme === 'indigo-purple' ? 'bg-gradient-to-br from-indigo-600 to-purple-700' :
          formValues.colorSettings.theme === 'blue-cyan' ? 'bg-gradient-to-br from-blue-600 to-cyan-500' :
          formValues.colorSettings.theme === 'green-emerald' ? 'bg-gradient-to-br from-green-600 to-emerald-600' :
          formValues.colorSettings.theme === 'pink-rose' ? 'bg-gradient-to-br from-pink-600 to-rose-600' :
          formValues.colorSettings.theme === 'orange-red' ? 'bg-gradient-to-br from-orange-600 to-red-600' :
          formValues.colorSettings.theme === 'teal-navy' ? 'bg-gradient-to-br from-teal-700 to-blue-800' :
          formValues.colorSettings.theme === 'slate-professional' ? 'bg-gradient-to-br from-slate-700 to-slate-800' :
          'bg-gradient-to-br from-indigo-600 to-purple-700'
        : formValues.colorSettings.theme === 'indigo-purple' ? 'bg-indigo-600' :
          formValues.colorSettings.theme === 'blue-cyan' ? 'bg-blue-600' :
          formValues.colorSettings.theme === 'green-emerald' ? 'bg-green-600' :
          formValues.colorSettings.theme === 'pink-rose' ? 'bg-pink-600' :
          formValues.colorSettings.theme === 'orange-red' ? 'bg-orange-600' :
          formValues.colorSettings.theme === 'teal-navy' ? 'bg-teal-700' :
          formValues.colorSettings.theme === 'slate-professional' ? 'bg-slate-700' :
          'bg-indigo-600'
    }`}>
      Button
    </div>
    <span className={`text-sm font-medium transition-all ${
      formValues.colorSettings.theme === 'indigo-purple' ? 'text-indigo-600 dark:text-indigo-400' :
      formValues.colorSettings.theme === 'blue-cyan' ? 'text-blue-600 dark:text-blue-400' :
      formValues.colorSettings.theme === 'green-emerald' ? 'text-green-600 dark:text-green-400' :
      formValues.colorSettings.theme === 'pink-rose' ? 'text-pink-600 dark:text-pink-400' :
      formValues.colorSettings.theme === 'orange-red' ? 'text-orange-600 dark:text-orange-400' :
      formValues.colorSettings.theme === 'teal-navy' ? 'text-teal-700 dark:text-teal-300' :
      formValues.colorSettings.theme === 'slate-professional' ? 'text-slate-700 dark:text-slate-300' :
      'text-indigo-600 dark:text-indigo-400'
    }`}>
      Text Sample
    </span>
  </div>
</div>
          <DialogFooter className="pt-6 border-t border-gray-200/50 dark:border-slate-700/50">
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
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
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