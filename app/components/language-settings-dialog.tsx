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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { usePreferences, type Language } from "@/context/preferences-context"

interface LanguageSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LanguageSettingsDialog({ open, onOpenChange }: LanguageSettingsDialogProps) {
  const { toast } = useToast()
  const { language, setLanguage, t } = usePreferences()

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-900">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex gap-2 font-serif text-xl dark:text-white">
            {t("language")}
            <span className="rounded bg-muted px-1 text-xs dark:bg-slate-700">DEMO</span>
          </DialogTitle>
          <DialogDescription className="dark:text-slate-300 text-xs">Select your preferred language</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          <RadioGroup
            value={selectedLanguage}
            onValueChange={(value) => setSelectedLanguage(value as Language)}
            className="space-y-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="en" id="en" />
              <Label htmlFor="en" className="dark:text-white">
                {t("english")} (English)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="de" id="de" />
              <Label htmlFor="de" className="dark:text-white">
                {t("german")} (Deutsch)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="es" id="es" />
              <Label htmlFor="es" className="dark:text-white">
                {t("spanish")} (Español)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fr" id="fr" />
              <Label htmlFor="fr" className="dark:text-white">
                {t("french")} (Français)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pl" id="pl" />
              <Label htmlFor="pl" className="dark:text-white">
                {t("polish")} (Polski)
              </Label>
            </div>
          </RadioGroup>

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

