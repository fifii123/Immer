"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Upload, FolderPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { usePreferences } from '@/context/preferences-context'

export default function CreateProjectPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { t, addProject, darkMode } = usePreferences()
  
  const [formData, setFormData] = useState({
    projectName: '',
    subject: '',
    description: '',
  })
  
  const [files, setFiles] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    if (!formData.projectName.trim()) {
      toast({
        title: t("validationError"),
        description: t("projectNameRequired"),
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    const newProject = {
      id: Date.now(),
      name: formData.projectName.trim(),
      subject: formData.subject.trim(),
      description: formData.description.trim(),
      date: new Date().toLocaleDateString(),
      timestamp: Date.now(),
      files: files.map(file => file.name),
      createdAt: new Date().toISOString(),
    }

    addProject(newProject)

    toast({
      title: t("projectCreated"),
      description: t("projectCreatedDescription"),
    })

    setIsSubmitting(false)
    router.push('/')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  return (
    <div className={`min-h-screen p-4 ${darkMode ? 'bg-slate-900' : 'bg-gray-50'}`}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold">{t("createNewProject")}</h1>
            <p className="text-muted-foreground">{t("createProjectDescription")}</p>
          </div>
        </div>

        {/* Form */}
        <Card className={darkMode ? "bg-slate-800 border-slate-700" : "bg-white"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderPlus className="h-5 w-5" />
              {t("projectDetails")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="projectName">{t("projectName")} *</Label>
                <Input
                  id="projectName"
                  value={formData.projectName}
                  onChange={(e) => setFormData(prev => ({ ...prev, projectName: e.target.value }))}
                  placeholder={t("enterProjectName")}
                  className={darkMode ? "bg-slate-700 border-slate-600" : ""}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">{t("subject")}</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder={t("enterSubject")}
                  className={darkMode ? "bg-slate-700 border-slate-600" : ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t("description")} ({t("optional")})</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t("enterProjectDescription")}
                  className={darkMode ? "bg-slate-700 border-slate-600" : ""}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="files">{t("files")} ({t("optional")})</Label>
                <div className={`border-2 border-dashed rounded-lg p-6 text-center ${
                  darkMode ? 'border-slate-600 hover:border-slate-500' : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    {t("dragAndDropFiles")}
                  </p>
                  <Input
                    id="files"
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('files')?.click()}
                  >
                    {t("selectFiles")}
                  </Button>
                  {files.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {files.length} {files.length === 1 ? 'file' : 'files'} selected
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {t("cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={!formData.projectName.trim() || isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      {t("creating")}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {t("createProject")}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}