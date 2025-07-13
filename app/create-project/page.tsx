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
import { motion } from "framer-motion"
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
    <div className={`min-h-screen ${darkMode ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-gradient-to-br from-gray-50 to-purple-50/30'}`}>
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
              className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent"
            >
              {t("createNewProject") || "Create New Project"}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-gray-600 dark:text-gray-400 text-lg"
            >
              {t("createProjectDescription") || "Start your learning journey with a new project"}
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
              ? 'bg-gradient-to-br from-slate-800/90 to-slate-900/90 shadow-purple-500/10' 
              : 'bg-gradient-to-br from-white/90 to-purple-50/90 shadow-purple-500/20'
            }
          `}>
            <CardHeader className="space-y-4 pb-8">
              <div className="flex items-center gap-4">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.5 }}
                  className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg"
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
                        ? 'bg-slate-800/50 border-slate-600 focus:border-purple-500 focus:ring-purple-500/20' 
                        : 'bg-white/70 border-purple-200 focus:border-purple-500 focus:ring-purple-500/20'
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
                        ? 'bg-slate-800/50 border-slate-600 focus:border-purple-500 focus:ring-purple-500/20' 
                        : 'bg-white/70 border-purple-200 focus:border-purple-500 focus:ring-purple-500/20'
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
                        ? 'bg-slate-800/50 border-slate-600 focus:border-purple-500 focus:ring-purple-500/20' 
                        : 'bg-white/70 border-purple-200 focus:border-purple-500 focus:ring-purple-500/20'
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
                    {t("attachFiles") || "Attach Files"} 
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                      (Optional)
                    </span>
                  </Label>
                  
                  <div className={`
                    border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 hover:scale-[1.01]
                    ${darkMode 
                      ? 'border-slate-600 bg-slate-800/30 hover:border-purple-500 hover:bg-slate-700/30' 
                      : 'border-purple-300 bg-purple-50/30 hover:border-purple-500 hover:bg-purple-100/30'
                    }
                  `}>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="space-y-3"
                    >
                      <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 w-fit mx-auto">
                        <Upload className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-gray-900 dark:text-white">
                          {t("dropFilesHere") || "Drop files here or click to browse"}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {t("supportedFormats") || "PDF, DOC, DOCX, TXT files supported"}
                        </p>
                      </div>
                      <Input
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="opacity-0 absolute inset-0 cursor-pointer"
                        accept=".pdf,.doc,.docx,.txt"
                      />
                    </motion.div>
                  </div>

                  {files.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`
                        rounded-xl border p-4 space-y-2
                        ${darkMode 
                          ? 'bg-slate-800/50 border-slate-700/50' 
                          : 'bg-white/70 border-purple-200/50'
                        }
                      `}
                    >
                      <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                        {t("selectedFiles") || "Selected Files"} ({files.length})
                      </p>
                      {files.map((file, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`
                            flex items-center gap-3 p-3 rounded-lg transition-all
                            ${darkMode 
                              ? 'bg-slate-700/50 hover:bg-slate-600/50' 
                              : 'bg-purple-50/50 hover:bg-purple-100/50'
                            }
                          `}
                        >
                          <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">
                            {file.name}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setFiles(files.filter((_, i) => i !== index))}
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1.0 }}
                  className="flex gap-4 pt-6"
                >
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    className={`
                      flex-1 h-12 text-lg border-2 transition-all duration-300 hover:scale-[1.02]
                      ${darkMode 
                        ? 'border-slate-600 hover:border-slate-500 hover:bg-slate-800' 
                        : 'border-purple-200 hover:border-purple-300 hover:bg-purple-50'
                      }
                    `}
                  >
                    {t("cancel") || "Cancel"}
                  </Button>
                  
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1"
                  >
                    <Button
                      type="submit"
                      disabled={isSubmitting || !formData.projectName.trim()}
                      className="
                        w-full h-12 text-lg bg-gradient-to-r from-purple-600 to-indigo-600 
                        hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg 
                        shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 
                        transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
                      "
                    >
                      {isSubmitting ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="mr-2"
                          >
                            <Save className="h-5 w-5" />
                          </motion.div>
                          {t("creating") || "Creating..."}
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-5 w-5" />
                          {t("createProject") || "Create Project"}
                        </>
                      )}
                    </Button>
                  </motion.div>
                </motion.div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}