"use client"

import * as React from "react"
import { Save, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { usePreferences, type Project } from "@/context/preferences-context"

interface AddMaterialDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project
}

export function AddMaterialDialog({ open, onOpenChange, project }: AddMaterialDialogProps) {
  const { toast } = useToast()
  const { t, removeProject, addProject } = usePreferences()

  const [files, setFiles] = React.useState<File[]>([])

  // Reset files when dialog opens
  React.useEffect(() => {
    if (open) {
      setFiles([])
    }
  }, [open])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(Array.from(e.target.files))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    if (files.length === 0) {
      toast({
        title: t("validationError"),
        description: t("noFilesSelected"),
        variant: "destructive",
      })
      return
    }

    // Create updated project
    const updatedProject = {
      ...project,
      files: [...(project.files || []), ...files.map((file) => file.name)],
    }

    // Remove old project and add updated one
    removeProject(project.id)
    addProject(updatedProject)

    // Show success message
    toast({
      title: t("materialAdded"),
      description: t("materialAddedDescription"),
    })

    // Close dialog
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="dark:text-white">{t("addNewMaterial")}</DialogTitle>
          <DialogDescription className="dark:text-slate-300">{t("uploadFilesToProject")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="dark:text-white">{t("selectFiles")}</Label>
              <div className="rounded-lg border border-dashed p-6 text-center dark:border-slate-700 dark:bg-slate-800">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">{t("dragAndDropFiles")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("orClickToUpload")}</p>
                <Input id="files" type="file" multiple className="mt-4 dark:bg-slate-700" onChange={handleFileChange} />
              </div>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                <Label className="dark:text-white">{t("selectedFiles")}</Label>
                <ul className="rounded-md border p-2 dark:border-slate-700 dark:bg-slate-800">
                  {files.map((file, index) => (
                    <li key={index} className="py-1">
                      <span className="text-sm dark:text-white">{file.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" className="gap-2">
              <Save className="h-4 w-4" />
              {t("addMaterial")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

