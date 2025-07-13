"use client"

import * as React from "react"
import { Plus, Save, Upload, X, GraduationCap, BookOpen, School, FileText } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { usePreferences } from "@/context/preferences-context"
import { motion, AnimatePresence } from "framer-motion"

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
  const { t, darkMode } = usePreferences()
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
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100
      }
    },
    exit: { 
      opacity: 0, 
      x: -100,
      transition: {
        duration: 0.2
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto border-0 bg-gradient-to-br from-white to-orange-50 dark:from-slate-900 dark:to-slate-800 shadow-2xl">
        <DialogHeader className="pb-6 border-b border-orange-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-3 mb-2">
            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg"
            >
              <GraduationCap className="h-6 w-6 text-white" />
            </motion.div>
            <div className="flex-1">
              <DialogTitle className="font-bold text-2xl bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                {t("almaMater")}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                {t("enterAcademicInfo")}
              </DialogDescription>
            </div>
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 font-medium">
              DEMO
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            ({t("canBeUpdated")})
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* University Section */}
            <motion.div variants={itemVariants} className={`space-y-4 p-4 rounded-xl border ${
              darkMode 
                ? 'bg-slate-800/30 border-slate-700/50' 
                : 'bg-orange-50/50 border-orange-200/50'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <School className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-700 dark:text-gray-300">
                  {t("universityInformation")}
                </h3>
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="university" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("universityAndYear")}
                </Label>
                <Input
                  id="university"
                  value={formData.university}
                  onChange={(e) => setFormData((prev) => ({ ...prev, university: e.target.value }))}
                  placeholder={t("universityPlaceholder")}
                  className="transition-all duration-200 border-2 focus:border-orange-500 focus:ring-orange-500/20 dark:bg-slate-800/50 dark:text-white dark:border-slate-600 dark:focus:border-orange-400 rounded-lg backdrop-blur-sm"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="major" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("majorDegree")}
                </Label>
                <Input
                  id="major"
                  value={formData.major}
                  onChange={(e) => setFormData((prev) => ({ ...prev, major: e.target.value }))}
                  placeholder={t("majorPlaceholder")}
                  className="transition-all duration-200 border-2 focus:border-orange-500 focus:ring-orange-500/20 dark:bg-slate-800/50 dark:text-white dark:border-slate-600 dark:focus:border-orange-400 rounded-lg backdrop-blur-sm"
                />
              </div>
            </motion.div>

            {/* Courses Section */}
            <motion.div variants={itemVariants} className={`space-y-4 p-4 rounded-xl border ${
              darkMode 
                ? 'bg-slate-800/30 border-slate-700/50' 
                : 'bg-orange-50/50 border-orange-200/50'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-700 dark:text-gray-300">
                    {t("currentCourses")}
                  </h3>
                </div>
                <Badge variant="outline" className="text-xs">
                  {formData.courses.length} {formData.courses.length === 1 ? 'course' : 'courses'}
                </Badge>
              </div>
              
              <div className="space-y-3">
                <AnimatePresence>
                  {formData.courses.map((course, index) => (
                    <motion.div
                      key={course.id}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      layout
                      className={`p-4 rounded-xl border transition-all ${
                        darkMode 
                          ? 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50' 
                          : 'bg-white/70 border-orange-200/50 hover:bg-orange-50/50'
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              darkMode ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {index + 1}
                            </div>
                            <Input
                              value={course.name}
                              onChange={(e) => handleCourseChange(course.id, e.target.value)}
                              placeholder={t("enterCourseName")}
                              className="border-2 focus:border-orange-500 focus:ring-orange-500/20 dark:bg-slate-800/50 dark:border-slate-600 dark:focus:border-orange-400 rounded-lg transition-all"
                            />
                          </div>
                          
                          {course.syllabus && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className={`flex items-center gap-2 p-2 rounded-lg ${
                                darkMode ? 'bg-slate-700/50' : 'bg-orange-100/50'
                              }`}
                            >
                              <FileText className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                              <p className="text-xs text-muted-foreground truncate">
                                {t("attached")}: {course.syllabus.name}
                              </p>
                            </motion.div>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className={`h-9 w-9 shrink-0 transition-all ${
                                darkMode 
                                  ? 'border-slate-700 bg-slate-800/50 text-orange-400 hover:bg-orange-900/20 hover:border-orange-500' 
                                  : 'border-orange-300 bg-white/50 text-orange-600 hover:bg-orange-50 hover:border-orange-400'
                              }`}
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
                              <Upload className="h-4 w-4" />
                            </Button>
                          </motion.div>
                          
                          {formData.courses.length > 1 && (
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className={`h-9 w-9 shrink-0 transition-all ${
                                  darkMode 
                                    ? 'border-slate-700 bg-slate-800/50 text-red-400 hover:bg-red-900/20 hover:border-red-500' 
                                    : 'border-red-300 bg-white/50 text-red-600 hover:bg-red-50 hover:border-red-400'
                                }`}
                                onClick={() => handleRemoveCourse(course.id)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    type="button"
                    variant="outline"
                    className={`w-full h-12 border-2 border-dashed transition-all ${
                      darkMode 
                        ? 'border-slate-600 hover:border-orange-500 hover:bg-orange-900/10 text-slate-300 hover:text-orange-300' 
                        : 'border-orange-300 hover:border-orange-500 hover:bg-orange-50 text-orange-600'
                    }`}
                    onClick={handleAddCourse}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {t("addCourse")}
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>

          <DialogFooter className="pt-6 border-t border-orange-200/50 dark:border-slate-700/50">
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
                  className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {t("submit")}
                </Button>
              </motion.div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}