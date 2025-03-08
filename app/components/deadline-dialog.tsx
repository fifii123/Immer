"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useToast } from "@/components/ui/use-toast"
import { usePreferences, type Deadline } from "@/context/preferences-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface DeadlineDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate?: Date
}

export function DeadlineDialog({ open, onOpenChange, selectedDate }: DeadlineDialogProps) {
  const { toast } = useToast()
  const { t, projects, addDeadline } = usePreferences()

  const [date, setDate] = React.useState<Date | undefined>(selectedDate || new Date())
  const [title, setTitle] = React.useState("")
  const [projectId, setProjectId] = React.useState<string | undefined>(undefined)

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setDate(selectedDate || new Date())
      setTitle("")
      setProjectId(undefined)
    }
  }, [open, selectedDate])

  const handleDateSelect = (newDate: Date | undefined) => {
    setDate(newDate)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate form
    if (!title.trim()) {
      toast({
        title: t("validationError"),
        description: t("deadlineTitleRequired"),
        variant: "destructive",
      })
      return
    }

    if (!date) {
      toast({
        title: t("validationError"),
        description: t("deadlineDateRequired"),
        variant: "destructive",
      })
      return
    }

    // Create new deadline
    const newDeadline: Deadline = {
      id: Date.now(),
      title: title.trim(),
      date: date.toISOString(),
      projectId: projectId ? Number.parseInt(projectId) : undefined,
    }

    // Add deadline
    addDeadline(newDeadline)

    // Show success message
    toast({
      title: t("deadlineAdded"),
      description: t("deadlineAddedDescription"),
    })

    // Close dialog
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] dark:border-slate-700 dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle className="dark:text-white">{t("addDeadline")}</DialogTitle>
          <DialogDescription className="dark:text-slate-300">
            {t("addDeadlineDescription") || "Add a new deadline to your calendar."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="dark:text-white">
                {t("deadlineTitle") || "Title"}
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("enterDeadlineTitle") || "Enter deadline title"}
                className="dark:bg-slate-800 dark:text-white dark:border-slate-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date" className="dark:text-white">
                {t("deadlineDate") || "Date"}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal dark:bg-slate-800 dark:text-white dark:border-slate-700"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>{t("selectDate") || "Select a date"}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 dark:border-slate-700 dark:bg-slate-800">
                  <Calendar mode="single" selected={date} onSelect={handleDateSelect} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project" className="dark:text-white">
                {t("project") || "Project"} ({t("optional") || "Optional"})
              </Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger id="project" className="w-full dark:bg-slate-800 dark:text-white dark:border-slate-700">
                  <SelectValue placeholder={t("selectProject") || "Select a project"} />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:text-white dark:border-slate-700">
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" className="gap-2">
              <Save className="h-4 w-4" />
              {t("save") || "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

