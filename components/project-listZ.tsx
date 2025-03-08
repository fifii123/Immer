"use client"

import { FolderPlus, Package, Trash2, Pencil } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { usePreferences } from "@/context/preferences-context"
import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function ProjectList() {
  const router = useRouter()
  const { menuDisplay, darkMode, t, projects, removeProject } = usePreferences()
  const [deleteProjectId, setDeleteProjectId] = useState<number | null>(null)

  // Find the project to delete
  const projectToDelete = projects.find((p) => p.id === deleteProjectId)

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (deleteProjectId) {
      removeProject(deleteProjectId)
      setDeleteProjectId(null)
    }
  }

  // Handle project click
  const handleProjectClick = (projectId: number) => {
    router.push(`/project/${projectId}`)
  }

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
        // Project list when there are projects
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className={`group relative w-full rounded-lg p-4 text-left transition-colors ${
                darkMode ? "bg-slate-800 hover:bg-slate-700 border border-slate-700" : "bg-[#f5f1eb] hover:bg-[#ede9e3]"
              }`}
              onClick={() => handleProjectClick(project.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleProjectClick(project.id)
                }
              }}
            >
              {/* Project content */}
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 mt-1" />
                <div>
                  <h3 className="font-medium">{project.name}</h3>
                  <p className="text-sm text-muted-foreground">{project.date}</p>
                  {project.subject && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("subject")}: {project.subject}
                    </p>
                  )}
                </div>
              </div>

              {/* Hover actions */}
              <div className="absolute right-4 top-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm dark:bg-slate-700/50"
                  title={t("editProject")}
                  onClick={(e) => {
                    e.stopPropagation()
                    // Edit functionality will be added later
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
                    e.stopPropagation()
                    setDeleteProjectId(project.id)
                  }}
                  title={t("deleteProject")}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">{t("deleteProject")}</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (  
        // Empty state when there are no projects
<div

  className={`grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 rounded-lg p-8 text-center flex flex-col items-center justify-center ${ // grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteProjectId !== null} onOpenChange={(open) => !open && setDeleteProjectId(null)}>
        <AlertDialogContent className="dark:border-slate-700 dark:bg-slate-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-white">{t("confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteProjectConfirmation", { projectName: projectToDelete?.name || "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:hover:bg-slate-700">
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    
  )
}

