"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Upload, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { usePreferences } from "@/context/preferences-context"
import { SidebarProvider } from "@/components/ui/sidebar"

export default function CreateProjectPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { t, addProject } = usePreferences()

  const [formData, setFormData] = useState({
    subject: "",
    projectName: t("newProject") + "1",
    files: [] as File[],
  })

  // Update project name when subject changes
  useEffect(() => {
    if (formData.subject) {
      setFormData((prev) => ({
        ...prev,
        projectName: formData.subject + "1",
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        projectName: t("newProject") + "1",
      }))
    }
  }, [formData.subject, t])

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

    // Create new project
    const newProject = {
      id: Date.now(),
      name: formData.projectName,
      subject: formData.subject,
      date: new Date().toLocaleString(),
      files: formData.files.map((file) => file.name),
    }

    // Add project to context
    addProject(newProject)

    // Show success message
    toast({
      title: t("projectCreated"),
      description: t("projectCreatedDescription"),
    })

    // Redirect to home page
    router.push("/")
  }

  return (
    <SidebarProvider>
      <div className="container mx-auto max-w-4xl py-8 px-4 sm:px-6">
        <div className="mb-6 flex items-center">
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => router.push("/")}>
            <ArrowLeft className="h-4 w-4" />
            {t("back")}
          </Button>
        </div>

        <div className="rounded-lg border p-6 dark:border-slate-700 dark:bg-slate-900">
          <h1 className="mb-6 text-2xl font-bold dark:text-white">{t("createNewProject")}</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                <Label className="dark:text-white">{t("attachFiles")}</Label>
                <div className="rounded-lg border border-dashed p-6 text-center dark:border-slate-700 dark:bg-slate-800">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">{t("dragAndDropFiles")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t("orClickToUpload")}</p>
                  <Input
                    id="files"
                    type="file"
                    multiple
                    className="mt-4 dark:bg-slate-700"
                    onChange={handleFileChange}
                  />
                </div>

                {formData.files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <Label className="dark:text-white">{t("attachedFiles")}</Label>
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
                            <ArrowLeft className="h-4 w-4 rotate-45" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <Button type="submit" className="gap-2">
              <Save className="h-4 w-4" />
              {t("createProject")}
            </Button>
          </form>
        </div>
      </div>
    </SidebarProvider>
  )
}

