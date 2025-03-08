"use client"

import { useEffect } from "react"
import { usePreferences } from "@/context/preferences-context"

export default function WelcomeHeader() {
  const { displayName, currentGreeting, refreshGreeting } = usePreferences()

  // Refresh greeting when component mounts (simulates page load)
  useEffect(() => {
    refreshGreeting()
  }, [refreshGreeting])

  return (
    <div className="space-y-2 text-center w-full">
      <div className="flex items-center gap-1 justify-center">
        <div className="bg-red-500 text-white px-1 rounded">
          <span className="font-semibold">Im</span>
        </div>
        <span className="text-xl font-serif">Immer.</span>
      </div>
      <h1 className="text-3xl md:text-4xl font-serif">
        {currentGreeting} {displayName}
      </h1>
    </div>
  )
}

