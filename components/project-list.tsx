"use client";

import { FolderPlus, Package, Trash2, Pencil, Loader } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { usePreferences } from "@/context/preferences-context";
import { useProjects } from "@/context/projects-context";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ProjectList() {
  const router = useRouter();
  const { menuDisplay, darkMode, t } = usePreferences();
  const { projects, removeProject, fetchProjects } = useProjects();
  const [deleteProjectId, setDeleteProjectId] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const projectToDelete = projects.find((p) => p.project_id === deleteProjectId);

  const handleDeleteConfirm = async () => {
    if (deleteProjectId !== null) {
      setLoadingId(deleteProjectId);
  
      try {
        await removeProject(deleteProjectId);
        setDeleteProjectId(null);
      } catch (error) {
        console.error("Error deleting project:", error);
      } finally {
        setTimeout(() => {
          setLoadingId(null);
          setDialogOpen(false);
        }, 500);
      }
    }
  };
  
  useEffect(() => {
    fetchProjects();
  }, []);

  const handleProjectClick = (projectId: number) => {
    router.push(`/project/${projectId}`);
  };

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

  return (
    <div className="w-full min-h-[calc(100vh-200px)] flex flex-col">
      {/* Header Section */}
      <div className="w-full max-w-6xl mx-auto space-y-6 flex-shrink-0 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 shrink-0" />
            <h2 className="text-lg font-medium">{t("allProjects")}</h2>
          </div>
          <div className="flex flex-1 flex-col sm:flex-row gap-3 sm:justify-end">
            <Select defaultValue={menuDisplay}>
              <SelectTrigger className="w-full sm:w-[180px] dark:bg-slate-800 dark:text-white dark:border-slate-700">
                <SelectValue placeholder={t("allProjects")} />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:text-white dark:border-slate-700">
                <SelectItem value="default">{t("allProjects")}</SelectItem>
                <SelectItem value="subjects">{t("subjects")}</SelectItem>
                <SelectItem value="catalogs">{t("catalogs")}</SelectItem>
              </SelectContent>
            </Select>
            <Input
              className="w-full sm:max-w-xs dark:bg-slate-800 dark:text-white dark:border-slate-700"
              placeholder={t("searchProjects")}
            />
          </div>
        </div>
      </div>

      {/* Content Section - fills remaining space */}
      <div className="flex-1 w-full max-w-6xl mx-auto">
        {projects.length > 0 ? (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
          >
            <AnimatePresence>
              {projects.map((project) => (
                <motion.div
                  key={project.project_id}
                  variants={itemVariants}
                  layout
                  className={`group relative w-full rounded-xl p-6 text-left transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border backdrop-blur-sm cursor-pointer ${
                    darkMode 
                      ? "bg-gradient-to-br from-slate-800/90 to-slate-900/90 hover:from-slate-700/90 hover:to-slate-800/90 border-slate-700/50 shadow-lg" 
                      : "bg-gradient-to-br from-white/90 to-gray-50/90 hover:from-gray-50/90 hover:to-white/90 border-gray-200/50 shadow-md"
                  }`}
                  onClick={() => handleProjectClick(project.project_id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      handleProjectClick(project.project_id);
                    }
                  }}
                  whileHover={{ 
                    scale: 1.02,
                    transition: { duration: 0.2 }
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start gap-4">
                    <motion.div 
                      className={`p-3 rounded-lg ${darkMode ? 'bg-blue-500/20' : 'bg-blue-100'}`}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Package className={`h-6 w-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-1 truncate">{project.subject_name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{project.date || "No date"}</p>
                      {project.subject_name && (
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          darkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {t("subject")}: {project.subject_name}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="absolute right-4 top-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm dark:bg-slate-700/50 hover:bg-indigo-500/20 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200"
                        title={t("editProject")}
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/project/${project.project_id}/edit`);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">{t("editProject")}</span>
                      </Button>
                    </motion.div>
                    
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm text-destructive hover:text-destructive dark:bg-slate-700/50 hover:bg-red-500/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteProjectId(project.project_id);
                          setDialogOpen(true);
                        }}
                        title={t("deleteProject")}
                        disabled={loadingId === project.project_id}
                      >
                        {loadingId === project.project_id ? (
                          <Loader className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        <span className="sr-only">{t("deleteProject")}</span>
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          // Empty State - Centered and fills remaining space
          <div className="flex items-center justify-center min-h-[60vh]">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className={`
                max-w-md mx-auto text-center p-8 rounded-2xl border backdrop-blur-lg
                ${darkMode 
                  ? 'bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-slate-700/50 shadow-2xl' 
                  : 'bg-gradient-to-br from-white/80 to-purple-50/80 border-purple-200/50 shadow-xl shadow-purple-500/10'
                }
              `}
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                className="p-4 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/25 mx-auto w-fit mb-6"
              >
                <FolderPlus className="h-12 w-12 text-white" />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="space-y-4"
              >
                <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  {t("noProjectsYet") || "No projects yet"}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {t("createFirstProject") || "Create your first project to start your learning journey. Upload materials, take notes, and track your progress."}
                </p>
                
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      onClick={() => router.push("/create-project")}
                      className="mt-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300"
                      size="lg"
                    >
                      <FolderPlus className="mr-2 h-5 w-5" />
                      {t("createFirstProject") || "Create Your First Project"}
                    </Button>
                  </motion.div>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent className={darkMode ? "bg-slate-800 border-slate-700" : "bg-white"}>
          <AlertDialogHeader>
            <AlertDialogTitle className={darkMode ? "text-white" : "text-gray-900"}>
              {t("confirmDeletion") || "Confirm Deletion"}
            </AlertDialogTitle>
            <AlertDialogDescription className={darkMode ? "text-gray-300" : "text-gray-600"}>
              {t("deleteProjectConfirmation") || "Are you sure you want to delete this project?"}{" "}
              <span className="font-medium">
                {projectToDelete?.subject_name}
              </span>
              ? {t("actionCannotBeUndone") || "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setDialogOpen(false)}
              className={darkMode ? "bg-slate-700 text-white hover:bg-slate-600" : ""}
            >
              {t("cancel") || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={loadingId !== null}
            >
              {loadingId !== null ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  {t("deleting") || "Deleting..."}
                </>
              ) : (
                t("delete") || "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}