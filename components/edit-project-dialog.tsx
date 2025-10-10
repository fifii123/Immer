"use client"

import * as React from "react"
import { Save, Upload, X, Edit3, BookOpen, FileText, Plus, Trash2 } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { usePreferences, type Project } from "@/context/preferences-context"
import { motion, AnimatePresence } from "framer-motion"
import { useDropzone } from "react-dropzone"

interface EditProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project
}

interface FileWithPreview extends File {
  id: string
  isNew?: boolean
}

const subjectSuggestions = [
  "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science",
  "History", "Literature", "Philosophy", "Psychology", "Economics",
  "Engineering", "Medicine", "Law", "Business", "Art", "Music"
]

export function EditProjectDialog({ open, onOpenChange, project }: EditProjectDialogProps) {
  const { toast } = useToast()
  const { t, removeProject, addProject, darkMode } = usePreferences()

  const [formData, setFormData] = React.useState({
    projectName: project.name,
    subject: project.subject || "",
    existingFiles: project.files || [],
  })
  
  const [newFiles, setNewFiles] = React.useState<FileWithPreview[]>([])
  const [showSuggestions, setShowSuggestions] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Reset form data when dialog opens or project changes
  React.useEffect(() => {
    if (open) {
      setFormData({
        projectName: project.name,
        subject: project.subject || "",
        existingFiles: project.files || [],
      })
      setNewFiles([])
      setShowSuggestions(false)
      setIsSubmitting(false)
    }
  }, [open, project])

  // Dropzone setup
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      const filesWithId = acceptedFiles.map(file => ({
        ...file,
        id: crypto.randomUUID(),
        isNew: true
      }))
      setNewFiles(prev => [...prev, ...filesWithId])
    }
  })

  const removeNewFile = (id: string) => {
    setNewFiles(prev => prev.filter(file => file.id !== id))
  }

  const removeExistingFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      existingFiles: prev.existingFiles.filter((_, i) => i !== index)
    }))
  }

  const handleSubjectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFormData(prev => ({ ...prev, subject: value }))
    setShowSuggestions(value.length > 0)
  }

  const selectSuggestion = (suggestion: string) => {
    setFormData(prev => ({ ...prev, subject: suggestion }))
    setShowSuggestions(false)
  }

  const filteredSuggestions = subjectSuggestions.filter(subject =>
    subject.toLowerCase().includes(formData.subject.toLowerCase()) &&
    subject.toLowerCase() !== formData.subject.toLowerCase()
  ).slice(0, 5)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Validate form
    if (!formData.projectName.trim()) {
      toast({
        title: t("validationError"),
        description: t("projectNameRequired"),
        variant: "destructive",
      })
      setIsSubmitting(false)
      return
    }

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800))

    // Create updated project
    const updatedProject = {
      ...project,
      name: formData.projectName.trim(),
      subject: formData.subject.trim(),
      files: [
        ...formData.existingFiles,
        ...newFiles.map(file => file.name)
      ],
      updatedAt: new Date().toISOString(),
    }

    // Update project
    removeProject(project.id)
    addProject(updatedProject)

    // Show success message
    toast({
      title: t("projectUpdated"),
      description: t("projectUpdatedDescription"),
    })

    setIsSubmitting(false)
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

  const totalFiles = formData.existingFiles.length + newFiles.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto border-0 bg-gradient-to-br from-white to-purple-50 dark:from-slate-900 dark:to-slate-800 shadow-2xl">
        <DialogHeader className="pb-6 border-b border-purple-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-3 mb-2">
            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg"
            >
              <Edit3 className="h-6 w-6 text-white" />
            </motion.div>
            <div className="flex-1">
              <DialogTitle className="font-bold text-2xl bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                {t("editProject")}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                {t("updateProjectDetails") || "Update your project information and materials"}
              </DialogDescription>
            </div>
            <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
              Editing
            </Badge>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Project Details Section */}
            <motion.div variants={itemVariants} className={`space-y-4 p-4 rounded-xl border ${
              darkMode 
                ? 'bg-slate-800/30 border-slate-700/50' 
                : 'bg-purple-50/50 border-purple-200/50'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-700 dark:text-gray-300">
                  Project Information
                </h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="projectName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("projectName")} *
                  </Label>
                  <Input
                    id="projectName"
                    value={formData.projectName}
                    onChange={(e) => setFormData(prev => ({ ...prev, projectName: e.target.value }))}
                    placeholder={t("enterProjectName") || "Enter project name"}
                    className="transition-all duration-200 border-2 focus:border-purple-500 focus:ring-purple-500/20 dark:bg-slate-800/50 dark:text-white dark:border-slate-600 dark:focus:border-purple-400 rounded-lg backdrop-blur-sm"
                    required
                  />
                </div>

                <div className="space-y-3 relative">
                  <Label htmlFor="subject" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("subject")}
                  </Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={handleSubjectChange}
                    onFocus={() => setShowSuggestions(formData.subject.length > 0)}
                    placeholder={t("enterSubject") || "Enter subject"}
                    className="transition-all duration-200 border-2 focus:border-purple-500 focus:ring-purple-500/20 dark:bg-slate-800/50 dark:text-white dark:border-slate-600 dark:focus:border-purple-400 rounded-lg backdrop-blur-sm"
                  />
                  
                  {/* Subject Suggestions */}
                  <AnimatePresence>
                    {showSuggestions && filteredSuggestions.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`absolute z-10 w-full mt-1 rounded-lg border shadow-lg ${
                          darkMode 
                            ? 'bg-slate-800 border-slate-700' 
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        {filteredSuggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => selectSuggestion(suggestion)}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-purple-50 dark:hover:bg-slate-700 first:rounded-t-lg last:rounded-b-lg transition-colors ${
                              darkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("description")} ({t("optional")})
                  </Label>

                </div>
              </div>
            </motion.div>

            {/* Existing Files Section */}
            {formData.existingFiles.length > 0 && (
              <motion.div variants={itemVariants} className={`space-y-4 p-4 rounded-xl border ${
                darkMode 
                  ? 'bg-slate-800/30 border-slate-700/50' 
                  : 'bg-purple-50/50 border-purple-200/50'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-700 dark:text-gray-300">
                      Current Files
                    </h3>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {formData.existingFiles.length} files
                  </Badge>
                </div>
                
                <div className={`rounded-xl border p-3 space-y-2 max-h-32 overflow-y-auto ${
                  darkMode 
                    ? 'bg-slate-800/50 border-slate-700/50' 
                    : 'bg-white/70 border-purple-200/50'
                }`}>
                  <AnimatePresence>
                    {formData.existingFiles.map((fileName, index) => (
                      <motion.div
                        key={`existing-${index}`}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                        className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                          darkMode 
                            ? 'bg-slate-700/50 border-slate-600/50 hover:bg-slate-600/50' 
                            : 'bg-white/70 border-purple-200/50 hover:bg-purple-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                          <span className="text-sm truncate font-medium text-gray-900 dark:text-gray-100">
                            {fileName}
                          </span>
                        </div>
                        
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={`h-7 w-7 rounded-full ${
                              darkMode 
                                ? 'text-red-400 hover:bg-red-900/20' 
                                : 'text-red-600 hover:bg-red-50'
                            }`}
                            onClick={() => removeExistingFile(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </motion.div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* Add New Files Section */}
            <motion.div variants={itemVariants} className={`space-y-4 p-4 rounded-xl border ${
              darkMode 
                ? 'bg-slate-800/30 border-slate-700/50' 
                : 'bg-purple-50/50 border-purple-200/50'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-700 dark:text-gray-300">
                    Add New Files ({t("optional")})
                  </h3>
                </div>
                {newFiles.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    +{newFiles.length} new
                  </Badge>
                )}
              </div>
              
              {/* Upload Area */}
              <div
                {...getRootProps()}
                className={`relative rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-300 cursor-pointer ${
                  isDragActive
                    ? darkMode
                      ? 'border-purple-400 bg-purple-900/20'
                      : 'border-purple-500 bg-purple-50'
                    : darkMode
                      ? 'border-slate-600 hover:border-purple-400 hover:bg-slate-800/50'
                      : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50/50'
                }`}
              >
                <input {...getInputProps()} />
                <motion.div
                  animate={isDragActive ? { scale: 1.05 } : { scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="flex flex-col items-center"
                >
                  <div className={`p-3 rounded-full mb-3 ${
                    isDragActive
                      ? darkMode ? 'bg-purple-500/20' : 'bg-purple-100'
                      : darkMode ? 'bg-slate-700/50' : 'bg-gray-100'
                  }`}>
                    <Upload className={`h-6 w-6 ${
                      isDragActive
                        ? darkMode ? 'text-purple-400' : 'text-purple-600'
                        : darkMode ? 'text-slate-400' : 'text-gray-500'
                    }`} />
                  </div>
                  <p className="font-medium mb-1 text-gray-900 dark:text-gray-100">
                    {isDragActive ? 'Drop files here' : 'Add more files'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Drag and drop or click to browse
                  </p>
                </motion.div>
              </div>

              {/* New Files List */}
              {newFiles.length > 0 && (
                <div className={`rounded-xl border p-3 space-y-2 max-h-32 overflow-y-auto ${
                  darkMode 
                    ? 'bg-slate-800/50 border-slate-700/50' 
                    : 'bg-white/70 border-purple-200/50'
                }`}>
                  <AnimatePresence>
                    {newFiles.map((file) => (
                      <motion.div
                        key={file.id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                        className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                          darkMode 
                            ? 'bg-slate-700/50 border-slate-600/50 hover:bg-slate-600/50' 
                            : 'bg-white/70 border-purple-200/50 hover:bg-purple-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="p-1 rounded bg-green-100 dark:bg-green-900/30">
                            <Plus className="h-3 w-3 text-green-600 dark:text-green-400" />
                          </div>
                          <span className="text-sm truncate font-medium text-gray-900 dark:text-gray-100">
                            {file.name}
                          </span>
                          <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                            New
                          </Badge>
                        </div>
                        
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={`h-7 w-7 rounded-full ${
                              darkMode 
                                ? 'text-red-400 hover:bg-red-900/20' 
                                : 'text-red-600 hover:bg-red-50'
                            }`}
                            onClick={() => removeNewFile(file.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </motion.div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>

            {/* Summary */}
            {totalFiles > 0 && (
              <motion.div variants={itemVariants} className={`p-3 rounded-lg border ${
                darkMode 
                  ? 'bg-slate-800/20 border-slate-700/50' 
                  : 'bg-purple-50/30 border-purple-200/50'
              }`}>
                <p className="text-sm text-center text-muted-foreground">
                  Total files: {totalFiles} ({formData.existingFiles.length} existing + {newFiles.length} new)
                </p>
              </motion.div>
            )}
          </motion.div>

          <DialogFooter className="pt-6 border-t border-purple-200/50 dark:border-slate-700/50">
            <div className="flex gap-3 w-full sm:w-auto">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none border-2 hover:bg-gray-50 dark:hover:bg-slate-800"
              >
                {t("cancel")}
              </Button>
              <motion.div
                whileHover={!isSubmitting ? { scale: 1.05 } : {}}
                whileTap={!isSubmitting ? { scale: 0.95 } : {}}
                className="flex-1 sm:flex-none"
              >
                <Button 
                  type="submit" 
                  disabled={!formData.projectName.trim() || isSubmitting}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"
                    />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {isSubmitting ? t("updating") || "Updating..." : t("updateProject")}
                </Button>
              </motion.div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}