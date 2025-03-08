"use client"

import { useState } from "react"
import { format, isSameDay, parseISO } from "date-fns"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DeadlineDialog } from "@/components/deadline-dialog"
import { usePreferences } from "@/context/preferences-context"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Plus, Trash2 } from "lucide-react"

export default function CalendarPage() {
  const { deadlines, removeDeadline, t, projects } = usePreferences()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [isAddingDeadline, setIsAddingDeadline] = useState(false)

  // Get deadlines for the selected date
  const selectedDateDeadlines = deadlines.filter(
    (deadline) => selectedDate && isSameDay(parseISO(deadline.date), selectedDate),
  )

  // Function to get project name by ID
  const getProjectName = (projectId?: number) => {
    if (!projectId) return null
    const project = projects.find((p) => p.id === projectId)
    return project ? project.name : null
  }

  // Function to highlight dates with deadlines
  const isDayWithDeadline = (day: Date) => {
    return deadlines.some((deadline) => {
      const deadlineDate = parseISO(deadline.date)
      return isSameDay(deadlineDate, day)
    })
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background text-foreground">
        <AppSidebar />
        <SidebarInset>
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 w-full">
            <div className="max-w-7xl mx-auto">
              <h1 className="text-2xl font-bold mb-6 dark:text-white">
                {t("deadlinesCalendar") || "Deadlines Calendar"}
              </h1>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar */}
                <Card className="lg:col-span-2 dark:border-slate-700 dark:bg-slate-900">
                  <CardHeader>
                    <CardTitle className="dark:text-white">{t("calendar") || "Calendar"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        className="rounded-md border dark:border-slate-700"
                        modifiers={{
                          hasDeadline: isDayWithDeadline,
                        }}
                        modifiersStyles={{
                          hasDeadline: {
                            fontWeight: "bold",
                            textDecoration: "underline",
                            color: "var(--primary)",
                          },
                        }}
                      />
                      <Button onClick={() => setIsAddingDeadline(true)} className="mt-4 gap-2">
                        <Plus className="h-4 w-4" />
                        {t("addDeadline") || "Add Deadline"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Selected Date Deadlines */}
                <Card className="dark:border-slate-700 dark:bg-slate-900">
                  <CardHeader>
                    <CardTitle className="dark:text-white">
                      {selectedDate ? format(selectedDate, "MMMM d, yyyy") : ""}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedDateDeadlines.length > 0 ? (
                      <ul className="space-y-3">
                        {selectedDateDeadlines.map((deadline) => (
                          <li
                            key={deadline.id}
                            className="flex items-start justify-between gap-2 p-3 rounded-md border dark:border-slate-700"
                          >
                            <div>
                              <p className="font-medium dark:text-white">{deadline.title}</p>
                              {deadline.projectId && (
                                <p className="text-sm text-muted-foreground dark:text-slate-400">
                                  {getProjectName(deadline.projectId)}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeDeadline(deadline.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-center py-6 text-muted-foreground dark:text-slate-400">
                        {t("noDeadlinesForDate") || "No deadlines for this date"}
                      </p>
                    )}
                    <Button onClick={() => setIsAddingDeadline(true)} className="w-full mt-4 gap-2">
                      <Plus className="h-4 w-4" />
                      {t("addDeadlineForDate") || "Add Deadline for This Date"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>

      <DeadlineDialog open={isAddingDeadline} onOpenChange={setIsAddingDeadline} selectedDate={selectedDate} />
    </SidebarProvider>
  )
}

