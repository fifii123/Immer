"use client"

import { useRouter } from "next/navigation"
import { usePreferences } from "@/context/preferences-context"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Clock, Calendar, CheckCircle2, Bell, BarChart, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { format, parseISO, isAfter, isBefore, isSameDay } from "date-fns"
import { useState } from "react"
import { DeadlineDialog } from "@/components/deadline-dialog"

export default function DashboardSidebar() {
  const router = useRouter()
  const { darkMode, t, projects, deadlines } = usePreferences()
  const [isAddingDeadline, setIsAddingDeadline] = useState(false)

  // Generate mock recent activity based on actual projects
  const recentActivity =
    projects.length > 0
      ? projects.slice(0, 4).map((project, index) => ({
          id: index,
          action: index === 0 ? "Project created" : ["Material added", "Note updated", "Project updated"][index % 3],
          project: project.name,
          time: ["2 hours ago", "Yesterday", "2 days ago", "3 days ago"][index % 4],
        }))
      : []

  // Get upcoming deadlines (future deadlines, sorted by date)
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Set to beginning of day for accurate comparison

  const upcomingDeadlines = deadlines
    .filter((deadline) => {
      const deadlineDate = parseISO(deadline.date)
      return isAfter(deadlineDate, today) || isSameDay(deadlineDate, today)
    })
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
    .slice(0, 3) // Show only the next 3 deadlines

  // Function to get project name by ID
  const getProjectName = (projectId?: number) => {
    if (!projectId) return null
    const project = projects.find((p) => p.id === projectId)
    return project ? project.name : null
  }

  // Function to format deadline date
  const formatDeadlineDate = (dateString: string) => {
    const date = parseISO(dateString)
    const now = new Date()
    now.setHours(0, 0, 0, 0) // Set to beginning of day

    // If deadline is today
    if (isSameDay(date, now)) {
      return t("today") || "Today"
    }

    // If deadline is tomorrow
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    if (isSameDay(date, tomorrow)) {
      return t("tomorrow") || "Tomorrow"
    }

    // If deadline is within the next 7 days, show day of week
    const nextWeek = new Date(now)
    nextWeek.setDate(nextWeek.getDate() + 7)
    if (isBefore(date, nextWeek)) {
      return format(date, "EEEE") // Day of week
    }

    // Otherwise show full date
    return format(date, "MMM d, yyyy")
  }

  return (
    <div className="w-full lg:w-96 space-y-6 flex-shrink-0">
      {/* Statistics Card - Coming Soon */}
      <Card className={darkMode ? "bg-slate-800 border-slate-700" : ""}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart className="h-5 w-5 text-primary" />
            {t("statistics") || "Statistics"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <BarChart className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
          <p className="text-sm font-medium">{t("comingSoon") || "Coming Soon"}</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
            {t("statisticsComingSoon") || "Detailed project statistics will be available in a future update."}
          </p>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className={darkMode ? "bg-slate-800 border-slate-700" : ""}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            {t("recentActivity") || "Recent Activity"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <ul className="space-y-3">
              {recentActivity.map((activity) => (
                <li key={activity.id} className="flex gap-3 items-start">
                  <div className={`mt-0.5 h-2 w-2 rounded-full ${darkMode ? "bg-blue-400" : "bg-blue-500"}`} />
                  <div>
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.project}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Clock className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
              <p className="text-sm font-medium">{t("noRecentActivity") || "No Recent Activity"}</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                {t("createProjectToSeeActivity") || "Create your first project to see activity here."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Deadlines */}
      <Card className={darkMode ? "bg-slate-800 border-slate-700" : ""}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {t("upcomingDeadlines") || "Upcoming Deadlines"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingDeadlines.length > 0 ? (
            <ul className="space-y-3">
              {upcomingDeadlines.map((deadline) => (
                <li key={deadline.id} className="flex gap-3 items-start">
                  <CheckCircle2 className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{deadline.title}</p>
                    {deadline.projectId && (
                      <p className="text-xs text-muted-foreground">{getProjectName(deadline.projectId)}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{formatDeadlineDate(deadline.date)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Bell className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">{t("noUpcomingDeadlines") || "No upcoming deadlines"}</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-0 pb-4 flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className={`gap-1 ${darkMode ? "border-slate-700 hover:bg-slate-700" : ""}`}
            onClick={() => setIsAddingDeadline(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("addDeadline") || "Add Deadline"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={`gap-1 ${darkMode ? "border-slate-700 hover:bg-slate-700" : ""}`}
            onClick={() => router.push("/calendar")}
          >
            <Calendar className="h-3.5 w-3.5" />
            {t("viewCalendar") || "View Calendar"}
          </Button>
        </CardFooter>
      </Card>

      <DeadlineDialog open={isAddingDeadline} onOpenChange={setIsAddingDeadline} />
    </div>
  )
}

