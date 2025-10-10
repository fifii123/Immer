"use client"

import * as React from "react"
import { Save, Upload, File, FileText, Image, Video, Music, X, CloudUpload, Plus } from "lucide-react"
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
import { usePreferences, type Project } from "@/context/preferences-context"
import { motion, AnimatePresence } from "framer-motion"

interface AddMaterialDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project
}

interface FileWithPreview extends File {
  id: string
  preview?: string
}

const getFileIcon = (file: File) => {
  const type = file.type.toLowerCase()
  const name = file.name.toLowerCase()
  
  if (type.startsWith('image/')) return Image
  if (type.startsWith('video/')) return Video
  if (type.startsWith('audio/')) return Music
  if (type.includes('pdf') || name.endsWith('.pdf')) return FileText
  return File
}

const getFileTypeColor = (file: File) => {
  const type = file.type.toLowerCase()
  const name = file.name.toLowerCase()
  
  if (type.startsWith('image/')) return 'from-green-500 to-emerald-600'
  if (type.startsWith('video/')) return 'from-red-500 to-pink-600'
  if (type.startsWith('audio/')) return 'from-purple-500 to-violet-600'
  if (type.includes('pdf') || name.endsWith('.pdf')) return 'from-red-600 to-orange-600'
  return 'from-blue-500 to-indigo-600'
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function AddMaterialDialog({ open, onOpenChange, project }: AddMaterialDialogProps) {
  const { toast } = useToast()
  const { t, removeProject, addProject, darkMode } = usePreferences()

  const [files, setFiles] = React.useState<FileWithPreview[]>([])
  const [isDragOver, setIsDragOver] = React.useState(false)

  // Reset files when dialog opens
  React.useEffect(() => {
    if (open) {
      setFiles([])
    }
  }, [open])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map(file => ({
        ...file,
        id: crypto.randomUUID()
      }))
      setFiles(prev => [...prev, ...newFiles])
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files).map(file => ({
        ...file,
        id: crypto.randomUUID()
      }))
      setFiles(prev => [...prev, ...newFiles])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(file => file.id !== id))
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto border-0 bg-gradient-to-br from-white to-blue-50 dark:from-slate-900 dark:to-slate-800 shadow-2xl">
        <DialogHeader className="pb-6 border-b border-blue-200/50 dark:border-slate-700/50">
          <div className="flex items-center gap-3 mb-2">
            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg"
            >
              <CloudUpload className="h-6 w-6 text-white" />
            </motion.div>
            <div className="flex-1">
              <DialogTitle className="font-bold text-2xl bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                {t("addNewMaterial")}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                {t("uploadFilesToProject")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            {/* Upload Area */}
            <motion.div variants={itemVariants} className="space-y-4">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("selectFiles")}
              </Label>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
                  isDragOver
                    ? darkMode
                      ? 'border-blue-400 bg-blue-900/20'
                      : 'border-blue-500 bg-blue-50'
                    : darkMode
                      ? 'border-slate-600 hover:border-blue-400 hover:bg-slate-800/50'
                      : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50'
                }`}
              >
                <motion.div
                  animate={isDragOver ? { scale: 1.1 } : { scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="flex flex-col items-center"
                >
                  <div className={`p-4 rounded-full mb-4 ${
                    isDragOver
                      ? darkMode ? 'bg-blue-500/20' : 'bg-blue-100'
                      : darkMode ? 'bg-slate-700/50' : 'bg-gray-100'
                  }`}>
                    <CloudUpload className={`h-8 w-8 ${
                      isDragOver
                        ? darkMode ? 'text-blue-400' : 'text-blue-600'
                        : darkMode ? 'text-slate-400' : 'text-gray-500'
                    }`} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
                    {isDragOver ? 'Drop files here' : 'Drag and drop files'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    PDF, DOC, DOCX, images, videos, and more
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="relative overflow-hidden border-2 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.multiple = true
                      input.accept = '*/*'
                      input.onchange = handleFileChange
                      input.click()
                    }}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Files
                  </Button>
                </motion.div>
              </div>
            </motion.div>

            {/* File List */}
            {files.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Selected Files
                  </Label>
                  <Badge variant="outline" className="text-xs">
                    {files.length} {files.length === 1 ? 'file' : 'files'}
                  </Badge>
                </div>
                
                <div className={`rounded-xl border p-4 space-y-3 max-h-60 overflow-y-auto ${
                  darkMode 
                    ? 'bg-slate-800/30 border-slate-700/50' 
                    : 'bg-blue-50/50 border-blue-200/50'
                }`}>
                  <AnimatePresence>
                    {files.map((file) => {
                      const FileIcon = getFileIcon(file)
                      const colorClass = getFileTypeColor(file)
                      
                      return (
                        <motion.div
                          key={file.id}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          layout
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                            darkMode 
                              ? 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50' 
                              : 'bg-white/70 border-blue-200/50 hover:bg-blue-50/50'
                          }`}
                        >
                          <div className={`p-2 rounded-lg bg-gradient-to-br ${colorClass}`}>
                            <FileIcon className="h-4 w-4 text-white" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate text-gray-900 dark:text-gray-100">
                              {file.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                          
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 rounded-full ${
                                darkMode 
                                  ? 'text-red-400 hover:bg-red-900/20' 
                                  : 'text-red-600 hover:bg-red-50'
                              }`}
                              onClick={() => removeFile(file.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </motion.div>

          <DialogFooter className="pt-6 border-t border-blue-200/50 dark:border-slate-700/50">
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
                  disabled={files.length === 0}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {t("addMaterial")} ({files.length})
                </Button>
              </motion.div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}