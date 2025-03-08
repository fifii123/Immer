import { FileText, FileX } from "lucide-react"
import { usePreferences } from "@/context/preferences-context"
import { formatRelativeTime } from "@/utils/format-time"

export function RecentActivity() {
  const { projects, t } = usePreferences()

  // Sort projects by timestamp (newest first)
  const sortedProjects = [...projects].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))

  // Take the 3 most recent projects
  const recentProjects = sortedProjects.slice(0, 3)

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col space-y-1.5 p-4 pb-2">
        <h3 className="text-lg font-semibold leading-none tracking-tight dark:text-white">{t("recentActivity")}</h3>
      </div>
      <div className="p-4 pt-0">
        {recentProjects.length > 0 ? (
          <div className="space-y-4">
            {recentProjects.map((project) => (
              <div key={project.id} className="flex items-start gap-4">
                <div className="rounded-full bg-primary/10 p-2 dark:bg-primary/20">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none dark:text-white">{t("projectCreated")}</p>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">{project.name}</p>
                </div>
                <div className="text-xs text-muted-foreground dark:text-slate-400">
                  {project.timestamp ? formatRelativeTime(project.timestamp) : project.date}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileX className="mb-2 h-8 w-8 text-muted-foreground dark:text-slate-400" />
            <h3 className="text-lg font-semibold dark:text-white">{t("noRecentActivity")}</h3>
            <p className="text-sm text-muted-foreground dark:text-slate-400">{t("createProjectToSeeActivity")}</p>
          </div>
        )}
      </div>
    </div>
  )
}

