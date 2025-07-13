"use client";
import { useAuth } from "@/context/auth/AuthContext";
import { useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Settings, Plus, FileText, GraduationCap, Book, Upload, X, Loader, Brain, PenTool, BookOpen, FolderPlus, Star, Eye, Download, FileEdit, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePreferences } from "@/context/preferences-context";
import { useRouter } from "next/navigation";
import { useProjects } from "@/context/projects-context";
import PDFReader from "@/components/pdf-reader/pdf-reader";
import ProjectNotes from "../[id]/project-notes/project-notes";
import ProjectTests from "../[id]/project-tests/project-tests";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { darkMode, t } = usePreferences();
  const { projects, fetchProjects } = useProjects();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [activePdfFile, setActivePdfFile] = useState<{
    fileId: number;
    fileUrl: string;
    fileName: string;
  } | null>(null);
  
  const [showNotesView, setShowNotesView] = useState(false);
  const [showTestsView, setShowTestsView] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const project = projects.find((p) => p.project_id.toString() === params.id);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-950 to:gray-900">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8 rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-purple-200/50 dark:border-slate-700/50 shadow-xl"
        >
          <div className="p-4 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 w-fit mx-auto mb-6">
            <FolderPlus className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-4">
            {t("projectNotFound") || "Project Not Found"}
          </h1>
          <Button 
            onClick={() => router.push("/")}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("backToProjects") || "Back to Projects"}
          </Button>
        </motion.div>
      </div>
    );
  }

  // Functions remain the same but add animations
  const openPdfReader = (fileId: number, filePath: string, fileName: string) => {
    setShowNotesView(false);
    setShowTestsView(false);
    setActivePdfFile({
      fileId,
      fileUrl: filePath,
      fileName,
    });
  };
  
  const openNotesView = () => {
    setActivePdfFile(null);
    setShowTestsView(false);
    setShowNotesView(true);
  };
  
  const closeNotesView = () => {
    setShowNotesView(false);
  };
  
  const openTestsView = () => {
    setActivePdfFile(null);
    setShowNotesView(false);
    setShowTestsView(true);
  };
  
  const closeTestsView = () => {
    setShowTestsView(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFiles((prevFiles) => [...prevFiles, ...Array.from(files)]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleUploadFiles = async () => {
    if (selectedFiles.length === 0) {
      toast({ 
        title: t("validationError"), 
        description: t("noFilesSelected"), 
        variant: "destructive" 
      });
      return;
    }

    try {
      setUploading(true);

      if (!user?.id) {
        throw new Error("Brak identyfikatora użytkownika");
      }

      const formData = new FormData();
      formData.append("user_id", user.id.toString());
      formData.append("project_id", params.id.toString());
      
      selectedFiles.forEach((file) => {
        formData.append("attached_files", file);
      });

      const response = await fetch("/api/projects/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`File upload failed: ${response.status} ${errorText}`);
      }

      toast({ 
        title: t("uploadSuccess"), 
        description: t("filesAddedToProject") 
      });
      
      setShowUploadModal(false);
      setSelectedFiles([]);
      fetchProjects();
      
    } catch (error) {
      console.error("Upload error:", error);
      toast({ 
        title: t("uploadError"), 
        description: error instanceof Error ? error.message : t("fileUploadFailed"), 
        variant: "destructive" 
      });
    } finally {
      setUploading(false);
    }
  };

  // Action cards data
  const actionCards = [
    {
      title: t("notes") || "Notes",
      description: "View and edit project notes",
      icon: PenTool,
      gradient: "from-blue-500 to-cyan-600",
      onClick: openNotesView,
      count: 0 // You can add actual count from backend
    },
    {
      title: t("tests") || "Tests", 
      description: "Create and take tests",
      icon: Brain,
      gradient: "from-green-500 to-emerald-600",
      onClick: openTestsView,
      count: 0
    },
    {
      title: t("glossary") || "Glossary",
      description: "Manage terminology",
      icon: BookOpen,
      gradient: "from-purple-500 to-violet-600",
      onClick: () => {},
      count: 0
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950/30">
      {/* Modern Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`sticky top-0 z-10 backdrop-blur-xl border-b ${
          darkMode 
            ? "bg-slate-900/80 border-slate-700/50" 
            : "bg-white/80 border-purple-200/50"
        } shadow-lg shadow-purple-500/10`}
      >
        <div className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex items-center gap-6">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => router.push("/")}
                className="rounded-2xl h-12 w-12 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <ArrowLeft className="h-6 w-6" />
              </Button>
            </motion.div>
            
            <div className="space-y-1">
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent"
              >
                {project.subject_name}
              </motion.h1>
              {project.note_preferences && (
                <motion.p 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="text-sm text-muted-foreground"
                >
                  {project.note_preferences}
                </motion.p>
              )}
            </div>
          </div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex items-center gap-3"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                variant="outline"
                onClick={() => setShowUploadModal(true)}
                className="border-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50 dark:border-purple-800 dark:hover:border-purple-700 dark:hover:bg-purple-900/20 transition-all duration-300"
              >
                <Upload className="mr-2 h-4 w-4" />
                {t("addMaterial") || "Add Material"}
              </Button>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button 
                variant="ghost" 
                size="icon"
                className="rounded-2xl h-12 w-12 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Action Cards */}
          <motion.section variants={itemVariants}>
            <h2 className="text-xl font-semibold mb-6 bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              {t("projectActions") || "Project Actions"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {actionCards.map((card, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card 
                    className={`cursor-pointer group transition-all duration-300 hover:shadow-xl border-0 ${
                      darkMode 
                        ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl shadow-2xl shadow-purple-500/10' 
                        : 'bg-gradient-to-br from-white/80 to-purple-50/80 backdrop-blur-xl shadow-xl shadow-purple-500/20'
                    }`}
                    onClick={card.onClick}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <motion.div
                          whileHover={{ rotate: 10, scale: 1.1 }}
                          className={`p-3 rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg`}
                        >
                          <card.icon className="h-6 w-6 text-white" />
                        </motion.div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{card.title}</h3>
                          <p className="text-sm text-muted-foreground">{card.description}</p>
                          {card.count > 0 && (
                            <div className="mt-2">
                              <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-1 rounded-full">
                                {card.count} items
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Materials Section */}
          <motion.section variants={itemVariants}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                {t("materials") || "Materials"}
              </h2>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUploadModal(true)}
                  className="border-purple-200 hover:border-purple-300 hover:bg-purple-50 dark:border-purple-800 dark:hover:border-purple-700 dark:hover:bg-purple-900/20"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Files
                </Button>
              </motion.div>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence>
                {project.attached_file?.map((file, index) => (
                  <motion.div
                    key={file.file_id}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    whileHover={{ scale: 1.02, y: -5 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative group"
                  >
                    <Card
                      className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl border-0 ${
                        darkMode
                          ? "bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl shadow-lg hover:shadow-2xl shadow-blue-500/10"
                          : "bg-gradient-to-br from-white/80 to-blue-50/80 backdrop-blur-xl shadow-lg hover:shadow-xl shadow-blue-500/20"
                      }`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <motion.div
                            whileHover={{ rotate: 5, scale: 1.1 }}
                            className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg"
                          >
                            <FileText className="h-6 w-6 text-white" />
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {file.file_name}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              {file.total_pages ? `${file.total_pages} pages` : `ID: ${file.file_id}`}
                            </p>
                            <p className="text-xs text-blue-500 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 mt-1 md:block hidden">
                              Hover for actions ↗
                            </p>
                          </div>
                        </div>
                      </CardContent>

                      {/* Action Buttons Overlay */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileHover={{ opacity: 1, y: 0 }}
                        className={`
                          absolute inset-0 flex items-center justify-center
                          opacity-0 group-hover:opacity-100 transition-all duration-300
                          ${darkMode ? 'bg-slate-900/90' : 'bg-white/90'} 
                          backdrop-blur-sm
                          md:opacity-0 md:group-hover:opacity-100
                        `}
                      >
                        <div className="grid grid-cols-2 gap-3 p-4 w-full">
                          {/* View Button */}
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openPdfReader(file.file_id, file.file_path, file.file_name);
                              }}
                              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg"
                              title="Open in PDF Viewer"
                            >
                              <motion.div
                                whileHover={{ scale: 1.1 }}
                                className="mr-2"
                              >
                                <Eye className="h-4 w-4" />
                              </motion.div>
                              View
                            </Button>
                          </motion.div>

                          {/* Download Button */}
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Create download link
                                const link = document.createElement('a');
                                link.href = file.file_path;
                                link.download = file.file_name;
                                link.click();
                                
                                toast({
                                  title: t("downloadStarted") || "Download Started",
                                  description: `${file.file_name} is being downloaded`,
                                });
                              }}
                              className="w-full border-2 hover:bg-green-50 hover:border-green-300 dark:hover:bg-green-900/20 dark:hover:border-green-700"
                              title="Download file"
                            >
                              <motion.div
                                whileHover={{ y: -2 }}
                                className="mr-2"
                              >
                                <Download className="h-4 w-4" />
                              </motion.div>
                              Download
                            </Button>
                          </motion.div>

                          {/* Notes Button */}
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openNotesView();
                              }}
                              className="w-full border-2 hover:bg-purple-50 hover:border-purple-300 dark:hover:bg-purple-900/20 dark:hover:border-purple-700"
                              title="View or create notes"
                            >
                              <motion.div
                                whileHover={{ rotate: 10 }}
                                className="mr-2"
                              >
                                <FileEdit className="h-4 w-4" />
                              </motion.div>
                              Notes
                            </Button>
                          </motion.div>

                          {/* Generate Button */}
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openTestsView();
                              }}
                              className="w-full border-2 hover:bg-orange-50 hover:border-orange-300 dark:hover:bg-orange-900/20 dark:hover:border-orange-700"
                              title="Generate tests and flashcards"
                            >
                              <motion.div
                                whileHover={{ scale: 1.1 }}
                                className="mr-2"
                              >
                                <Zap className="h-4 w-4" />
                              </motion.div>
                              Generate
                            </Button>
                          </motion.div>
                        </div>
                      </motion.div>

                      {/* Mobile Action Buttons - Always visible on small screens */}
                      <div className="md:hidden border-t p-3">
                        <div className="grid grid-cols-4 gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openPdfReader(file.file_id, file.file_path, file.file_name)}
                            className="p-2 h-auto"
                            title="Open in PDF Viewer"
                          >
                            <div className="flex flex-col items-center gap-1">
                              <Eye className="h-4 w-4" />
                              <span className="text-xs">View</span>
                            </div>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = file.file_path;
                              link.download = file.file_name;
                              link.click();
                              
                              toast({
                                title: t("downloadStarted") || "Download Started",
                                description: `${file.file_name} is being downloaded`,
                              });
                            }}
                            className="p-2 h-auto"
                            title="Download file"
                          >
                            <div className="flex flex-col items-center gap-1">
                              <Download className="h-4 w-4" />
                              <span className="text-xs">Save</span>
                            </div>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={openNotesView}
                            className="p-2 h-auto"
                            title="View or create notes"
                          >
                            <div className="flex flex-col items-center gap-1">
                              <FileEdit className="h-4 w-4" />
                              <span className="text-xs">Notes</span>
                            </div>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={openTestsView}
                            className="p-2 h-auto"
                            title="Generate tests and flashcards"
                          >
                            <div className="flex flex-col items-center gap-1">
                              <Zap className="h-4 w-4" />
                              <span className="text-xs">Gen</span>
                            </div>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
                
                {/* Add New File Card */}
                <motion.div
                  variants={itemVariants}
                  whileHover={{ scale: 1.02, y: -5 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className={`group cursor-pointer transition-all duration-300 hover:shadow-xl border-2 border-dashed ${
                      darkMode
                        ? "border-purple-600/50 bg-gradient-to-br from-slate-800/50 to-purple-900/20 backdrop-blur-xl hover:border-purple-500 hover:bg-purple-900/30"
                        : "border-purple-300/50 bg-gradient-to-br from-white/50 to-purple-50/50 backdrop-blur-xl hover:border-purple-400 hover:bg-purple-100/50"
                    }`}
                    onClick={() => setShowUploadModal(true)}
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col items-center justify-center text-center space-y-3">
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 10 }}
                          className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg"
                        >
                          <Plus className="h-6 w-6 text-white" />
                        </motion.div>
                        <div>
                          <p className="font-medium text-purple-600 dark:text-purple-400">
                            {t("addNewFile") || "Add New File"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Upload PDF, DOC, or other materials
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.section>
        </motion.div>
      </main>

      {/* Enhanced Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !uploading && setShowUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-2xl rounded-2xl border-0 shadow-2xl backdrop-blur-xl ${
                darkMode 
                  ? "bg-slate-900/90 shadow-purple-500/20" 
                  : "bg-white/90 shadow-purple-500/20"
              }`}
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg"
                    >
                      <Upload className="h-6 w-6 text-white" />
                    </motion.div>
                    <div>
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                        {t("addNewMaterial") || "Add New Material"}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Upload files to enhance your project
                      </p>
                    </div>
                  </div>
                  
                  {!uploading && (
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setShowUploadModal(false)}
                        className="rounded-full"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </motion.div>
                  )}
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">{t("attachFiles") || "Attach Files"}</Label>
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      className={`rounded-xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
                        darkMode 
                          ? "border-purple-600/50 bg-slate-800/50 hover:border-purple-500 hover:bg-purple-900/20" 
                          : "border-purple-300/50 bg-purple-50/50 hover:border-purple-400 hover:bg-purple-100/50"
                      }`}
                    >
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="space-y-4"
                      >
                        <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 w-fit mx-auto">
                          <Upload className="h-8 w-8 text-white" />
                        </div>
                        <div>
                          <p className="text-lg font-medium">
                            {t("dragAndDropFiles") || "Drag and drop files here"}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            or click to browse • PDF, DOC, DOCX, TXT supported
                          </p>
                        </div>
                        <Input
                          id="files"
                          type="file"
                          multiple
                          className="opacity-0 absolute inset-0 cursor-pointer"
                          onChange={handleFileChange}
                          accept=".pdf,.doc,.docx,.txt"
                        />
                      </motion.div>
                    </motion.div>
                  </div>

                  {/* Selected Files */}
                  {selectedFiles.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                    >
                      <Label className="text-base font-semibold">
                        {t("selectedFiles") || "Selected Files"} ({selectedFiles.length})
                      </Label>
                      <div className={`rounded-xl border p-4 space-y-3 max-h-40 overflow-y-auto ${
                        darkMode 
                          ? 'bg-slate-800/50 border-slate-700/50' 
                          : 'bg-white/70 border-purple-200/50'
                      }`}>
                        <AnimatePresence>
                          {selectedFiles.map((file, index) => (
                            <motion.div
                              key={`${file.name}-${index}`}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 10 }}
                              transition={{ delay: index * 0.05 }}
                              className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                                darkMode 
                                  ? 'bg-slate-700/50 hover:bg-slate-600/50' 
                                  : 'bg-purple-50/50 hover:bg-purple-100/50'
                              }`}
                            >
                              <motion.div
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600"
                              >
                                <FileText className="h-4 w-4 text-white" />
                              </motion.div>
                              <span className="text-sm font-medium flex-1 truncate">
                                {file.name}
                              </span>
                              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeFile(index)}
                                  className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </motion.div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowUploadModal(false)}
                      disabled={uploading}
                      className="flex-1 h-12 border-2 hover:scale-[1.02] transition-all duration-300"
                    >
                      {t("cancel") || "Cancel"}
                    </Button>
                    
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1"
                    >
                      <Button
                        onClick={handleUploadFiles}
                        disabled={uploading || selectedFiles.length === 0}
                        className="w-full h-12 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                      >
                        {uploading ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="mr-2"
                            >
                              <Loader className="h-5 w-5" />
                            </motion.div>
                            {t("uploading") || "Uploading..."}
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-5 w-5" />
                            {t("uploadFiles") || "Upload Files"}
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Existing Modals */}
      {activePdfFile && (
        <PDFReader
          fileUrl={activePdfFile.fileUrl}
          fileName={activePdfFile.fileName}
          fileId={activePdfFile.fileId}
          onClose={() => setActivePdfFile(null)}
        />
      )}
      
      {showNotesView && (
        <ProjectNotes
          projectId={Number(params.id)}
          onClose={closeNotesView}
        />
      )}
      
      {showTestsView && (
        <ProjectTests
          projectId={Number(params.id)}
          onClose={closeTestsView}
        />
      )}
    </div>
  );
}