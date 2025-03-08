"use client"

import * as React from "react"
import { Save } from "lucide-react"
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
import { useToast } from "@/components/ui/use-toast"
import { usePreferences, type GreetingType } from "@/context/preferences-context"

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
  } = usePreferences()

  const [formValues, setFormValues] = React.useState({
    displayName: displayName,
    menuDisplay: menuDisplay,
    darkMode: darkMode,
    greetingType: greetingType,
  })

  // Update form values when context changes or dialog opens
  React.useEffect(() => {
    if (open) {
      setFormValues({
        displayName,
        menuDisplay,
        darkMode,
        greetingType,
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

    // Refresh greeting if it's alternating
    if (formValues.greetingType === "alternating") {
      refreshGreeting()
    }

    toast({
      title: t("preferencesSaved"),
      description: t("preferencesUpdated"),
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-900">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex gap-2 font-serif text-xl dark:text-white">
            {t("preferences")}
            <span className="rounded bg-muted px-1 text-xs dark:bg-slate-700">DEMO</span>
          </DialogTitle>
          <DialogDescription className="dark:text-slate-300 text-xs">{t("customizeExperience")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="displayName" className="text-sm dark:text-white">
                {t("howToReferToYou")}
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
                placeholder={t("enterPreferredName")}
                className="dark:bg-slate-800 dark:text-white dark:border-slate-700"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="greetingType" className="text-sm dark:text-white">
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
                  className="w-full dark:bg-slate-800 dark:text-white dark:border-slate-700"
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

            <div className="space-y-1">
              <Label htmlFor="menuDisplay" className="text-sm dark:text-white">
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
                  className="w-full dark:bg-slate-800 dark:text-white dark:border-slate-700"
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

            <div className="space-y-1">
              <Label className="text-sm dark:text-white">{t("additionalSettings")}</Label>
              <div className="rounded-lg border p-3 space-y-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center justify-between">
                  <Label htmlFor="darkMode" className="cursor-pointer text-sm dark:text-white">
                    {t("darkMode")}
                  </Label>
                  <Switch
                    id="darkMode"
                    checked={formValues.darkMode}
                    onCheckedChange={(checked) =>
                      setFormValues((prev) => ({
                        ...prev,
                        darkMode: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="notifications" className="cursor-pointer text-sm dark:text-white">
                    {t("emailNotifications")}
                  </Label>
                  <Switch id="notifications" defaultChecked />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="submit" className="gap-2">
              <Save className="h-4 w-4" />
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

