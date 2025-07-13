"use client";

import { FolderPlus, Package, Trash2, Pencil, Loader } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { usePreferences } from "@/context/preferences-context";
import { useProjects } from "@/context/projects-context";
import { useState, useEffect } from "react";
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
      setLoadingId(deleteProjectId); // Ustawienie ID ładowania
  
      try {
        await removeProject(deleteProjectId);
        setDeleteProjectId(null);
      } catch (error) {
        console.error("Error deleting project:", error);
      } finally {
        setTimeout(() => {
          setLoadingId(null); // Resetowanie ładowania z opóźnieniem
          setDialogOpen(false); // Zamknięcie okna po zakończeniu
        }, 500); // Opóźnienie 500ms, aby Loader był widoczny
      }
    }
  };
  
  useEffect(() => {
    fetchProjects();
  }, []);

  const handleProjectClick = (projectId: number) => {
    router.push(`/project/${projectId}`);
  };

  return (
    <div className="w-full space-y-4 max-w-6xl mx-auto">
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

      {projects.length > 0 ? (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {projects.map((project) => (
            <div
            key={project.project_id}
            className={`group relative w-full rounded-xl p-6 text-left transition-all duration-300 hover:shadow-xl hover:scale-[1.02] border backdrop-blur-sm ${
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
            >
<div className="flex items-start gap-4">
  <div className={`p-3 rounded-lg ${darkMode ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
    <Package className={`h-6 w-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
  </div>
  <div className="flex-1">
    <h3 className="font-semibold text-lg mb-1">{project.subject_name}</h3>
    <p className="text-sm text-muted-foreground mb-2">{"project.date"}</p>
    {project.subject_name && (
      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        darkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'
      }`}>
        {t("subject")}: {project.subject_name}
      </div>
    )}
  </div>
</div>

              <div className="absolute right-4 top-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm dark:bg-slate-700/50"
                  title={t("editProject")}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">{t("editProject")}</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm text-destructive hover:text-destructive dark:bg-slate-700/50"
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
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className={`grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 rounded-lg p-8 text-center flex flex-col items-center justify-center ${
            darkMode ? "bg-slate-800 border border-slate-700" : "bg-[#f5f1eb]"
          }`}
        >
          <div className={`rounded-full p-3 ${darkMode ? "bg-slate-700" : "bg-[#ede9e3]"}`}>
            <FolderPlus className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-medium">{t("noProjects")}</h3>
          <p className="text-sm text-muted-foreground max-w-xs">{t("noProjectsDescription")}</p>
          <Button className="mt-2" variant="outline" onClick={() => router.push("/create-project")}>
            {t("createFirstProject")}
          </Button>
        </div>
      )}

      <AlertDialog open={dialogOpen} onOpenChange={(open) => !open && setDialogOpen(false)}>
        <AlertDialogContent className="dark:border-slate-700 dark:bg-slate-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-white">{t("confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteProjectConfirmation", { projectName: projectToDelete?.subject_name || "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:hover:bg-slate-700">
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={loadingId !== null}
            >
              {loadingId !== null ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                t("delete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
