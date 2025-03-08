"use client"

import { FileText, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { usePreferences } from "@/context/preferences-context"

export default function ActionButtons() {
  const router = useRouter()
  const { darkMode, t } = usePreferences()

  return (
    <div className="flex gap-4 justify-center">
      <Button
        variant="outline"
        size="lg"
        className={`h-24 w-24 flex-col gap-2 text-white ${
          darkMode ? "bg-blue-700 hover:bg-blue-800 border-slate-700" : "bg-blue-600 hover:bg-blue-700"
        }`}
        onClick={() => router.push("/create-project")}
      >
        <Plus className="h-6 w-6" />
        <span className="text-sm font-normal">{t("newProject")}</span>
      </Button>
      <Button
        variant="outline"
        size="lg"
        className={`h-24 w-24 flex-col gap-2 text-white ${
          darkMode ? "bg-blue-700 hover:bg-blue-800 border-slate-700" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        <FileText className="h-6 w-6" />
        <span className="text-sm font-normal">{t("resources")}</span>
      </Button>
    </div>
  )
}

