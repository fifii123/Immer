"use client"

import { Calendar, Bell } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { usePreferences } from "@/context/preferences-context"

export function UpcomingDeadlines() {
  const { t } = usePreferences()

  // Mock data for upcoming deadlines - empty for now
  const upcomingDeadlines: { id: number; project: string; date: string }[] = []

  return (
    <Card className="dark:border-slate-700 dark:bg-slate-900">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold dark:text-white">{t("upcomingDeadlines")}</CardTitle>
      </CardHeader>
      <CardContent>
        {upcomingDeadlines.length > 0 ? (
          <ul className="space-y-3">
            {upcomingDeadlines.map((deadline) => (
              <li key={deadline.id} className="flex gap-3 items-start">
                <Calendar className="h-5 w-5 text-orange-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium dark:text-white">{deadline.project}</p>
                  <p className="text-xs text-muted-foreground dark:text-slate-400">{deadline.date}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Bell className="h-8 w-8 text-muted-foreground mb-2 opacity-50 dark:text-slate-400" />
            <p className="text-sm text-muted-foreground dark:text-slate-400">{t("noUpcomingDeadlines")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

