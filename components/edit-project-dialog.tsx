"use client"

import * as React from "react"
import { Save, Upload, X } from "lucide-react"
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

interface EditProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project
}

export function EditProjectDialog({ open, onOpenChange, project }: EditProjectDialogProps) {
  const { toast } = useToast()
  const { t, projects, addProject, removeProject } = usePreferences()

  const [formData, setFormData] = React.useState({
    subject: project.subject || "",
    projectName: project.name,
    files: [] as File[],
    existingFiles: project.files || [],
  })

  // Reset form data when dialog opens or project changes
  React.useEffect(() => {
    if (open) {
      setFormData({
        subject: project.subject || "",
        projectName: project.name,
        files: [],
        existingFiles: project.files || [],
      })
    }
  }, [open, project])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFormData((prev) => ({
        ...prev,
        files: [...prev.files, ...Array.from(e.target.files as FileList)],
      }))
    }
  }

  const removeFile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }))
  }

  const removeExistingFile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      existingFiles: prev.existingFiles.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    if (!formData.projectName.trim()) {
      toast({
        title: t("validationError"),
        description: t("projectNameRequired"),
        variant: "destructive",
      })
      return
    }

    // Create updated project
    const updatedProject = {
      ...project,
      name: formData.projectName,
      subject: formData.subject,
      files: [...formData.existingFiles, ...formData.files.map((file) => file.name)],
    }

    // Remove old project and add updated one
    removeProject(project.id)
    addProject(updatedProject)

    // Show success message
    toast({
      title: t("projectUpdated"),
      description: t("projectUpdatedDescription"),
    })

    // Close dialog
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="dark:text-white">{t("editProject")}</DialogTitle>
          <DialogDescription className="dark:text-slate-300">{t("updateProjectDetails")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject" className="dark:text-white">
                {t("subject")}
              </Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                placeholder={t("enterSubject")}
                className="dark:bg-slate-800 dark:text-white dark:border-slate-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectName" className="dark:text-white">
                {t("projectName")}
              </Label>
              <Input
                id="projectName"
                value={formData.projectName}
                onChange={(e) => setFormData((prev) => ({ ...prev, projectName: e.target.value }))}
                placeholder={t("enterProjectName")}
                className="dark:bg-slate-800 dark:text-white dark:border-slate-700"
              />
            </div>

            <div className="space-y-2">
              <Label className="dark:text-white">{t("existingFiles")}</Label>
              {formData.existingFiles.length > 0 ? (
                <ul className="rounded-md border p-2 dark:border-slate-700 dark:bg-slate-800">
                  {formData.existingFiles.map((file, index) => (
                    <li key={index} className="flex items-center justify-between py-1">
                      <span className="text-sm dark:text-white">{file}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExistingFile(index)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">{t("removeFile")}</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground dark:text-slate-400">{t("noExistingFiles")}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="dark:text-white">{t("attachFiles")}</Label>
              <div className="rounded-lg border border-dashed p-4 text-center dark:border-slate-700 dark:bg-slate-800">
                <Upload className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">{t("dragAndDropFiles")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("orClickToUpload")}</p>
                <Input id="files" type="file" multiple className="mt-4 dark:bg-slate-700" onChange={handleFileChange} />
              </div>

              {formData.files.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Label className="dark:text-white">{t("newFiles")}</Label>
                  <ul className="rounded-md border p-2 dark:border-slate-700 dark:bg-slate-800">
                    {formData.files.map((file, index) => (
                      <li key={index} className="flex items-center justify-between py-1">
                        <span className="text-sm dark:text-white">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">{t("removeFile")}</span>
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" className="gap-2">
              <Save className="h-4 w-4" />
              {t("saveChanges")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

