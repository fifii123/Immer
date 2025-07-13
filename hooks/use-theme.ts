import { usePreferences } from "@/context/preferences-context"
import { useMemo } from "react"

interface ThemeColors {
  primary: {
    solid: string
    solidDark: string
    gradient: string
    text: string
    textDark: string
    shadow: string
  }
  secondary: {
    solid: string
    solidDark: string
    gradient: string
    text: string
    textDark: string
  }
}

const COLOR_THEMES: Record<string, ThemeColors> = {
  "indigo-purple": {
    primary: {
      solid: "bg-indigo-600",
      solidDark: "dark:bg-indigo-500",
      gradient: "bg-gradient-to-br from-indigo-600 to-purple-700",
      text: "text-indigo-600",
      textDark: "dark:text-indigo-400",
      shadow: "shadow-indigo-500/25"
    },
    secondary: {
      solid: "bg-purple-600",
      solidDark: "dark:bg-purple-500", 
      gradient: "bg-gradient-to-br from-purple-500 to-pink-600",
      text: "text-purple-600",
      textDark: "dark:text-purple-400"
    }
  },
  "blue-cyan": {
    primary: {
      solid: "bg-blue-600",
      solidDark: "dark:bg-blue-500",
      gradient: "bg-gradient-to-br from-blue-600 to-cyan-500",
      text: "text-blue-600", 
      textDark: "dark:text-blue-400",
      shadow: "shadow-blue-500/25"
    },
    secondary: {
      solid: "bg-cyan-600",
      solidDark: "dark:bg-cyan-500",
      gradient: "bg-gradient-to-br from-cyan-500 to-teal-500",
      text: "text-cyan-600",
      textDark: "dark:text-cyan-400"
    }
  },
  "green-emerald": {
    primary: {
      solid: "bg-green-600",
      solidDark: "dark:bg-green-500",
      gradient: "bg-gradient-to-br from-green-600 to-emerald-600",
      text: "text-green-600",
      textDark: "dark:text-green-400", 
      shadow: "shadow-green-500/25"
    },
    secondary: {
      solid: "bg-emerald-600",
      solidDark: "dark:bg-emerald-500",
      gradient: "bg-gradient-to-br from-emerald-500 to-teal-500",
      text: "text-emerald-600",
      textDark: "dark:text-emerald-400"
    }
  },
  "pink-rose": {
    primary: {
      solid: "bg-pink-600",
      solidDark: "dark:bg-pink-500",
      gradient: "bg-gradient-to-br from-pink-600 to-rose-600",
      text: "text-pink-600",
      textDark: "dark:text-pink-400",
      shadow: "shadow-pink-500/25"
    },
    secondary: {
      solid: "bg-rose-600",
      solidDark: "dark:bg-rose-500",
      gradient: "bg-gradient-to-br from-rose-500 to-pink-500",
      text: "text-rose-600",
      textDark: "dark:text-rose-400"
    }
  },
  "orange-red": {
    primary: {
      solid: "bg-orange-600",
      solidDark: "dark:bg-orange-500",
      gradient: "bg-gradient-to-br from-orange-600 to-red-600",
      text: "text-orange-600",
      textDark: "dark:text-orange-400",
      shadow: "shadow-orange-500/25"
    },
    secondary: {
      solid: "bg-red-600", 
      solidDark: "dark:bg-red-500",
      gradient: "bg-gradient-to-br from-red-500 to-pink-500",
      text: "text-red-600",
      textDark: "dark:text-red-400"
    }
  },
  "teal-navy": {
    primary: {
      solid: "bg-teal-700",
      solidDark: "dark:bg-teal-600",
      gradient: "bg-gradient-to-br from-teal-700 to-blue-800",
      text: "text-teal-700",
      textDark: "dark:text-teal-300",
      shadow: "shadow-teal-500/25"
    },
    secondary: {
      solid: "bg-blue-800",
      solidDark: "dark:bg-blue-700",
      gradient: "bg-gradient-to-br from-blue-800 to-indigo-800",
      text: "text-blue-800",
      textDark: "dark:text-blue-300"
    }
  },
  "slate-professional": {
    primary: {
      solid: "bg-slate-700",
      solidDark: "dark:bg-slate-600",
      gradient: "bg-gradient-to-br from-slate-700 to-slate-800",
      text: "text-slate-700",
      textDark: "dark:text-slate-300",
      shadow: "shadow-slate-500/25"
    },
    secondary: {
      solid: "bg-slate-600",
      solidDark: "dark:bg-slate-500",
      gradient: "bg-gradient-to-br from-slate-600 to-slate-700", 
      text: "text-slate-600",
      textDark: "dark:text-slate-400"
    }
  }
}

export function useTheme() {
  const { colorSettings, darkMode } = usePreferences()
  
  const colors = useMemo(() => {
    return COLOR_THEMES[colorSettings.theme] || COLOR_THEMES["indigo-purple"]
  }, [colorSettings.theme])

  // Helper functions
  const getPrimaryClass = (element: 'bg' | 'text' = 'bg') => {
    if (element === 'text') {
      return `${colors.primary.text} ${colors.primary.textDark}`
    }
    
    if (!colorSettings.useGradients) {
      return `${colors.primary.solid} ${colors.primary.solidDark}`
    }
    
    return colors.primary.gradient
  }

  const getSecondaryClass = (element: 'bg' | 'text' = 'bg') => {
    if (element === 'text') {
      return `${colors.secondary.text} ${colors.secondary.textDark}`
    }
    
    if (!colorSettings.useGradients) {
      return `${colors.secondary.solid} ${colors.secondary.solidDark}`
    }
    
    return colors.secondary.gradient
  }

  const getGradientTextClass = () => {
    if (!colorSettings.useGradients) {
      return getPrimaryClass('text')
    }
    return `bg-gradient-to-r from-indigo-600 to-purple-700 bg-clip-text text-transparent`
  }

  const getShadowClass = () => {
    return colors.primary.shadow
  }

// Dedykowane gradienty dla przycisków
const getButtonGradient = (variant: 'primary' | 'secondary' | 'accent' = 'primary') => {
  if (!colorSettings.useGradients) {
    return variant === 'primary' ? `${colors.primary.solid} ${colors.primary.solidDark}` :
           variant === 'secondary' ? `${colors.secondary.solid} ${colors.secondary.solidDark}` :
           `${colors.primary.solid} ${colors.primary.solidDark}`
  }

  // Różne kierunki i intensywności dla każdego wariantu
  const buttonGradients: Record<string, Record<string, string>> = {
    "indigo-purple": {
      primary: "bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700",
      secondary: "bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600", 
      accent: "bg-gradient-to-br from-indigo-500 via-purple-600 to-purple-700"
    },
    "blue-cyan": {
      primary: "bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600",
      secondary: "bg-gradient-to-br from-cyan-600 via-cyan-700 to-teal-600",
      accent: "bg-gradient-to-br from-blue-500 via-cyan-600 to-teal-600"
    },
    "green-emerald": {
      primary: "bg-gradient-to-br from-green-600 via-green-700 to-emerald-700",
      secondary: "bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-600",
      accent: "bg-gradient-to-br from-green-500 via-emerald-600 to-emerald-700"
    },
    "pink-rose": {
      primary: "bg-gradient-to-br from-pink-600 via-pink-700 to-rose-700",
      secondary: "bg-gradient-to-br from-rose-600 via-rose-700 to-pink-600",
      accent: "bg-gradient-to-br from-pink-500 via-rose-600 to-rose-700"
    },
    "orange-red": {
      primary: "bg-gradient-to-br from-orange-600 via-orange-700 to-red-700",
      secondary: "bg-gradient-to-br from-red-600 via-red-700 to-pink-600",
      accent: "bg-gradient-to-br from-orange-500 via-red-600 to-red-700"
    },
    "teal-navy": {
      primary: "bg-gradient-to-br from-teal-700 via-teal-800 to-blue-900",
      secondary: "bg-gradient-to-br from-blue-800 via-blue-900 to-indigo-900",
      accent: "bg-gradient-to-br from-teal-600 via-blue-800 to-blue-900"
    },
    "slate-professional": {
      primary: "bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900",
      secondary: "bg-gradient-to-br from-slate-600 via-slate-700 to-slate-800",
      accent: "bg-gradient-to-br from-slate-600 via-slate-700 to-slate-900"
    }
  }

  const themeGradients = buttonGradients[colorSettings.theme] || buttonGradients["indigo-purple"]
  return themeGradients[variant] || themeGradients.primary
}

return {
  colors,
  theme: colorSettings.theme,
  useGradients: colorSettings.useGradients,
  getPrimaryClass,
  getSecondaryClass,
  getGradientTextClass,
  getShadowClass,
  getButtonGradient, // Nowa funkcja!
  isDark: darkMode
}
}