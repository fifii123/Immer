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
import { useTheme } from '@/hooks/use-theme'
import { motion } from "framer-motion"

export default function CreateProjectPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { t, addProject, darkMode } = usePreferences()
  const theme = useTheme()
  
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
    <div className={`min-h-screen ${darkMode 
      ? 'bg-gradient-to-br from-slate-900 to-slate-800' 
      : `bg-gradient-to-br from-gray-50 to-gray-100`
    }`}>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-6"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="rounded-2xl h-12 w-12 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </motion.div>
          
          <div className="space-y-2">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className={`text-4xl font-bold ${theme.getPrimaryClass('text')}`}
            >
              {t("createNewProject") || "Create New Project"}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-gray-600 dark:text-gray-400 text-lg"
            >
              {"Start your learning journey with a new project"}
            </motion.p>
          </div>
        </motion.div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card className={`
            border-0 shadow-2xl backdrop-blur-xl
            ${darkMode 
              ? 'bg-gradient-to-br from-slate-800/90 to-slate-900/90 shadow-lg' 
              : `bg-gradient-to-br from-white/90 to-gray-50/90 shadow-xl ${theme.getShadowClass()}`
            }
          `}>
            <CardHeader className="space-y-4 pb-8">
              <div className="flex items-center gap-4">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.5 }}
                  className={`p-3 rounded-xl ${theme.getPrimaryClass()} shadow-lg`}
                >
                  <FolderPlus className="h-8 w-8 text-white" />
                </motion.div>
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                    {t("projectDetails") || "Project Details"}
                  </CardTitle>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {t("fillProjectInfo") || "Fill in the information about your new project"}
                  </p>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className="space-y-3"
                >
                  <Label htmlFor="projectName" className="text-base font-semibold text-gray-900 dark:text-white">
                    {t("projectName") || "Project Name"} *
                  </Label>
                  <Input
                    id="projectName"
                    value={formData.projectName}
                    onChange={(e) => setFormData(prev => ({ ...prev, projectName: e.target.value }))}
                    placeholder={t("enterProjectName") || "Enter your project name"}
                    className={`
                      h-12 text-lg border-2 transition-all duration-300 focus:scale-[1.01]
                      ${darkMode 
                        ? `bg-slate-800/50 border-slate-600 hover:border-slate-500 focus:border-${theme.colors.primary.text.replace('text-', '')} focus:ring-${theme.colors.primary.text.replace('text-', '')}/20` 
                        : `bg-white/70 border-gray-300 hover:border-gray-400 focus:border-${theme.colors.primary.text.replace('text-', '')} focus:ring-${theme.colors.primary.text.replace('text-', '')}/20`
                      }
                    `}
                    required
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.7 }}
                  className="space-y-3"
                >
                  <Label htmlFor="subject" className="text-base font-semibold text-gray-900 dark:text-white">
                    {t("subject") || "Subject"}
                  </Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder={t("enterSubject") || "Enter the subject or category"}
                    className={`
                      h-12 text-lg border-2 transition-all duration-300 focus:scale-[1.01]
                      ${darkMode 
                        ? `bg-slate-800/50 border-slate-600 hover:border-slate-500 focus:border-${theme.colors.primary.text.replace('text-', '')} focus:ring-${theme.colors.primary.text.replace('text-', '')}/20` 
                        : `bg-white/70 border-gray-300 hover:border-gray-400 focus:border-${theme.colors.primary.text.replace('text-', '')} focus:ring-${theme.colors.primary.text.replace('text-', '')}/20`
                      }
                    `}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                  className="space-y-3"
                >
                  <Label htmlFor="description" className="text-base font-semibold text-gray-900 dark:text-white">
                    {t("description") || "Description"}
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder={t("enterDescription") || "Describe your project goals and objectives"}
                    rows={4}
                    className={`
                      text-lg border-2 transition-all duration-300 focus:scale-[1.01] resize-none
                      ${darkMode 
                        ? `bg-slate-800/50 border-slate-600 hover:border-slate-500 focus:border-${theme.colors.primary.text.replace('text-', '')} focus:ring-${theme.colors.primary.text.replace('text-', '')}/20` 
                        : `bg-white/70 border-gray-300 hover:border-gray-400 focus:border-${theme.colors.primary.text.replace('text-', '')} focus:ring-${theme.colors.primary.text.replace('text-', '')}/20`
                      }
                    `}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.9 }}
                  className="space-y-4"
                >
                  <Label className="text-base font-semibold text-gray-900 dark:text-white">
                    {t("attachFiles") || "Attach Files"} ({t("optional") || "Optional"})
                  </Label>
                  
                  <div className={`
                    relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer hover:border-solid
                    ${darkMode 
                      ? `border-slate-600 hover:border-${theme.colors.primary.text.replace('text-', '')} hover:bg-slate-800/30` 
                      : `border-gray-300 hover:border-${theme.colors.primary.text.replace('text-', '')} hover:bg-gray-50`
                    }
                  `}>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="space-y-3">
                      <div className={`mx-auto w-12 h-12 rounded-full ${theme.getPrimaryClass()} flex items-center justify-center`}>
                        <Upload className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className={`text-lg font-medium ${theme.getPrimaryClass('text')}`}>
                          {t("dragAndDropFiles") || "Drag and drop files here"}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                          {t("orClickToUpload") || "or click to upload"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Selected Files */}
                  {files.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-2"
                    >
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t("attachedFiles") || "Attached Files"} ({files.length})
                      </Label>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {files.map((file, index) => (
                          <div
                            key={index}
                            className={`
                              flex items-center gap-3 p-3 rounded-lg border
                              ${darkMode 
                                ? 'bg-slate-800/50 border-slate-600' 
                                : 'bg-gray-50 border-gray-200'
                              }
                            `}
                          >
                            <div className={`p-2 rounded ${theme.getPrimaryClass()} bg-opacity-10`}>
                              <Upload className={`h-4 w-4 ${theme.getPrimaryClass('text')}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{file.name}</p>
                              <p className="text-xs text-gray-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </motion.div>

                {/* Submit Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1.0 }}
                  className="flex items-center gap-4 pt-6"
                >
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className={`
                      flex-1 h-12 text-lg font-semibold ${theme.getButtonGradient('primary')} text-white 
                      hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 
                      shadow-lg ${theme.getShadowClass()} hover:shadow-xl
                      disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                    `}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        {t("creating") || "Creating..."}
                      </>
                    ) : (
                      <>
                        <Save className="mr-3 h-5 w-5" />
                        {t("createProject") || "Create Project"}
                      </>
                    )}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    className={`
                      px-8 h-12 border-2 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200
                      ${darkMode 
                        ? `border-slate-600 hover:border-${theme.colors.primary.text.replace('text-', '')} hover:${theme.colors.primary.textDark}` 
                        : `border-gray-300 hover:border-${theme.colors.primary.text.replace('text-', '')} hover:${theme.colors.primary.text}`
                      }
                    `}
                  >
                    {t("cancel") || "Cancel"}
                  </Button>
                </motion.div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}