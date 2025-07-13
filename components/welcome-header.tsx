"use client"

import { useEffect } from "react"
import { usePreferences } from "@/context/preferences-context"
import { motion } from "framer-motion"

export default function WelcomeHeader() {
  const { displayName, currentGreeting, refreshGreeting } = usePreferences()

  useEffect(() => {
    refreshGreeting()
  }, [refreshGreeting])

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="text-center w-full py-8"
    >
      <div className="space-y-4">
        {/* Logo */}
        <motion.div 
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="flex items-center gap-2 justify-center"
        >
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white px-3 py-1 rounded-lg shadow-lg shadow-indigo-500/25">
            <span className="font-bold text-lg">Im</span>
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-700 bg-clip-text text-transparent">
            Immer.
          </span>
        </motion.div>
        
        {/* Greeting */}
        <motion.h1 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-4xl md:text-5xl font-bold"
        >
          <span className="bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            {currentGreeting}
          </span>
          <span className="text-indigo-600 dark:text-indigo-400 ml-2">
            {displayName}
          </span>
        </motion.h1>
        
        {/* Subtitle */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-gray-600 dark:text-gray-400 text-lg"
        >
          Let's make today productive
        </motion.p>
      </div>
    </motion.div>
  )
}