"use client"

import * as React from "react"
import { Plus, Save, Upload, X } from "lucide-react"
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
import { usePreferences } from "@/context/preferences-context"

interface Course {
  id: string
  name: string
  syllabus?: File
}

interface AlmaMaterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AlmaMaterDialog({ open, onOpenChange }: AlmaMaterDialogProps) {
  const { toast } = useToast()
  const { t } = usePreferences()
  const [formData, setFormData] = React.useState({
    university: "",
    major: "",
    courses: [{ id: "1", name: "" }] as Course[],
  })

  const handleAddCourse = () => {
    setFormData((prev) => ({
      ...prev,
      courses: [...prev.courses, { id: crypto.randomUUID(), name: "" }],
    }))
  }

  const handleRemoveCourse = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      courses: prev.courses.filter((course) => course.id !== id),
    }))
  }

  const handleCourseChange = (id: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      courses: prev.courses.map((course) => (course.id === id ? { ...course, name: value } : course)),
    }))
  }

  const handleSyllabusUpload = (id: string, file: File) => {
    setFormData((prev) => ({
      ...prev,
      courses: prev.courses.map((course) => (course.id === id ? { ...course, syllabus: file } : course)),
    }))
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    // Here you would typically save to your backend
    toast({
      title: t("academicInfoSaved"),
      description: t("almaMaterUpdated"),
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto dark:border-slate-700 dark:bg-slate-900">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 font-serif text-xl dark:text-white">
            {t("almaMater")}
            <span className="rounded bg-muted px-1 text-xs dark:bg-slate-700">DEMO</span>
            <span className="text-sm font-normal text-muted-foreground ml-2 dark:text-slate-400">
              ({t("canBeUpdated")})
            </span>
          </DialogTitle>
          <DialogDescription className="dark:text-slate-300 text-xs">{t("enterAcademicInfo")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="university" className="text-sm dark:text-white">
                {t("universityAndYear")}
              </Label>
              <Input
                id="university"
                value={formData.university}
                onChange={(e) => setFormData((prev) => ({ ...prev, university: e.target.value }))}
                placeholder={t("universityPlaceholder")}
                className="dark:bg-slate-800 dark:text-white dark:border-slate-700"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="major" className="text-sm dark:text-white">
                {t("majorDegree")}
              </Label>
              <Input
                id="major"
                value={formData.major}
                onChange={(e) => setFormData((prev) => ({ ...prev, major: e.target.value }))}
                placeholder={t("majorPlaceholder")}
                className="dark:bg-slate-800 dark:text-white dark:border-slate-700"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-sm dark:text-white">{t("currentCourses")}</Label>
              <div className="space-y-2">
                {formData.courses.map((course) => (
                  <div key={course.id} className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <Input
                        value={course.name}
                        onChange={(e) => handleCourseChange(course.id, e.target.value)}
                        placeholder={t("enterCourseName")}
                        className="dark:bg-slate-800 dark:text-white dark:border-slate-700"
                      />
                      {course.syllabus && (
                        <p className="text-xs text-muted-foreground dark:text-slate-400">
                          {t("attached")}: {course.syllabus.name}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                        onClick={() => {
                          const input = document.createElement("input")
                          input.type = "file"
                          input.accept = ".pdf,.doc,.docx"
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0]
                            if (file) handleSyllabusUpload(course.id, file)
                          }
                          input.click()
                        }}
                      >
                        <Upload className="h-3 w-3" />
                      </Button>
                      {formData.courses.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 shrink-0 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                          onClick={() => handleRemoveCourse(course.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-1 h-8 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                onClick={handleAddCourse}
              >
                <Plus className="mr-1 h-3 w-3" />
                {t("addCourse")}
              </Button>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="submit" className="gap-2">
              <Save className="h-4 w-4" />
              {t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

