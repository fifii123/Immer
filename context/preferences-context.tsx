"use client"

import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from "react"

export type Language = "en" | "de" | "es" | "fr" | "pl"
export type GreetingType = "welcome" | "hello" | "goodToSeeYou" | "greetings" | "howdy" | "heyThere" | "alternating"

// Nowe typy dla systemu kolorów
export type ColorTheme = "indigo-purple" | "blue-cyan" | "green-emerald" | "slate-professional" | "orange-red" | "pink-rose" | "teal-navy" | "custom"

export interface ColorSettings {
  theme: ColorTheme
  useGradients: boolean
  customPrimary?: string
  customSecondary?: string
}

export interface ColorPalette {
  name: string
  primary: {
    from: string
    to: string
    text: string
    textDark: string
  }
  secondary: {
    from: string
    to: string
    text: string
    textDark: string
  }
  accent: {
    from: string
    to: string
    text: string
    textDark: string
  }
  success: string
  error: string
  warning: string
  info: string
}

export interface CustomColors {
  primary: string
  secondary: string
  accent: string
}

// Add Project type definition
export type Project = {
  id: number
  name: string
  subject?: string
  date: string
  files?: string[]
}

// Add Deadline type definition
export type Deadline = {
  id: number
  title: string
  date: string // ISO date string
  projectId?: number // Optional project association
}

// Define the context type
type PreferencesContextType = {
  displayName: string
  setDisplayName: (name: string) => void
  menuDisplay: string
  setMenuDisplay: (display: string) => void
  darkMode: boolean
  setDarkMode: (enabled: boolean) => void
  greetingType: GreetingType
  setGreetingType: (type: GreetingType) => void
  currentGreeting: string
  refreshGreeting: () => void
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string>) => string
  projects: Project[]
  addProject: (project: Project) => void
  removeProject: (id: number) => void
  deadlines: Deadline[]
  addDeadline: (deadline: Deadline) => void
  removeDeadline: (id: number) => void
  // Color system properties
  colorSettings: ColorSettings
  setColorSettings: (settings: ColorSettings) => void
  customColors: CustomColors
  setCustomColors: (colors: CustomColors) => void
  currentPalette: ColorPalette
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined)

// Array of greetings for the alternating option
const greetings = [
  "Welcome Back,",
  "Hello,",
  "Good to see you,",
  "Greetings,",
  "Howdy,",
  "Hey there,",
  "Nice to see you again,",
  "Glad you're here,",
]

// Translations for different languages
const translations: Record<Language, Record<string, string>> = {
  en: {
    // Greetings
    welcome: "Welcome Back,",
    hello: "Hello,",
    goodToSeeYou: "Good to see you,",
    greetings: "Greetings,",
    howdy: "Howdy,",
    heyThere: "Hey there,",
    welcomeBack: "Welcome Back",
    alternating: "Alternating (Random)",

    // Navigation
    settings: "Settings",
    account: "Account",
    preferences: "Preferences",
    almaMater: "Alma Mater",
    logout: "Logout",

    // Action buttons
    statistics: "Statistics",
    newProject: "New Project",
    resources: "Resources",
    quickStudy: "Quick Study",

    // Project list
    allProjects: "All Projects",
    subjects: "Subjects",
    catalogs: "Catalogs",
    searchProjects: "Search projects...",
    noProjects: "No projects yet",
    noProjectsDescription: "Create your first project to get started with organizing your work.",
    createFirstProject: "Create your first project",
    editProject: "Edit project",
    deleteProject: "Delete project",
    confirmDelete: "Confirm deletion",
    deleteProjectConfirmation:
      "Are you sure you want to delete the project '{projectName}'? This action cannot be undone.",
    delete: "Delete",

    // Language settings
    language: "Language",
    english: "English",
    german: "German",
    spanish: "Spanish",
    french: "French",
    polish: "Polish",
    languageUpdated: "Language updated",
    languagePreferenceSaved: "Your language preference has been saved.",

    // Preferences dialog
    customizeExperience: "Customize your experience",
    howToReferToYou: "How to refer to you?",
    enterPreferredName: "Enter your preferred name or title",
    greetingStyle: "Greeting Style",
    chooseGreetingStyle: "Choose greeting style",
    mainMenuDisplay: "Main Menu Display",
    chooseOption: "Choose Option",
    additionalSettings: "Additional Settings",
    darkMode: "Dark Mode",
    emailNotifications: "Email Notifications",
    preferencesSaved: "Preferences saved",
    preferencesUpdated: "Your preferences have been updated successfully.",

    // Appearance
    appearanceSettings: "Appearance Settings",
    darkModeDescription: "Switch between light and dark themes",
    emailNotificationsDescription: "Receive updates via email",
    colorTheme: "Color Theme",
    chooseColorScheme: "Choose Color Scheme",

    // Buttons
    save: "Save Changes",
    submit: "Submit",
    cancel: "Cancel",
    createNewProject: "Create New Project",
    subject: "Subject",
    enterSubject: "Enter subject (e.g., Biology, Mathematics)",
    projectName: "Project Name",
    enterProjectName: "Enter project name",
    attachFiles: "Attach Files",
    dragAndDropFiles: "Drag and drop files here",
    orClickToUpload: "or click to upload",
    attachedFiles: "Attached Files",
    createProject: "Create Project",
    back: "Back",
    projectCreated: "Project created",
    projectCreatedDescription: "Your project has been created successfully.",
    validationError: "Validation Error",
    projectNameRequired: "Project name is required",

    // Project page
    materials: "Materials",
    addNewMaterial: "Add New Material",
    openResources: "Open Resources",
    notes: "Notes",
    tests: "Tests",
    glossary: "Glossary",
    manageNotes: "Manage your project notes",
    manageTests: "Track your progress",
    manageGlossary: "Key terms and definitions",
    projectNotFound: "Project not found",
    backToProjects: "Back to Projects",
  },
  de: {
    welcome: "Willkommen zurück,",
    hello: "Hallo,",
    goodToSeeYou: "Schön dich zu sehen,",
    greetings: "Grüße,",
    howdy: "Howdy,",
    heyThere: "Hey du,",
    welcomeBack: "Willkommen zurück",
    alternating: "Wechselnd (Zufällig)",
    settings: "Einstellungen",
    account: "Konto",
    preferences: "Präferenzen",
    newProject: "Neues Projekt",
    quickStudy: "Schnelles Lernen",
  },
  es: {
    welcome: "Bienvenido de nuevo,",
    hello: "Hola,",
    goodToSeeYou: "Gusto en verte,",
    greetings: "Saludos,",
    howdy: "Hola,",
    heyThere: "Oye,",
    welcomeBack: "Bienvenido de nuevo",
    alternating: "Alternando (Aleatorio)",
    settings: "Configuración",
    account: "Cuenta", 
    preferences: "Preferencias",
    newProject: "Nuevo Proyecto",
    quickStudy: "Estudio Rápido",
  },
  fr: {
    welcome: "Bon retour,",
    hello: "Bonjour,",
    goodToSeeYou: "Ravi de te voir,",
    greetings: "Salutations,",
    howdy: "Salut,",
    heyThere: "Hé toi,",
    welcomeBack: "Bon retour",
    alternating: "Alternant (Aléatoire)",
    settings: "Paramètres",
    account: "Compte",
    preferences: "Préférences",
    newProject: "Nouveau Projet",
    quickStudy: "Étude Rapide",
  },
  pl: {
    welcome: "Witaj ponownie,",
    hello: "Cześć,",
    goodToSeeYou: "Miło Cię widzieć,",
    greetings: "Pozdrowienia,",
    howdy: "Hej,",
    heyThere: "Hej tam,",
    welcomeBack: "Witaj ponownie",
    alternating: "Zmieniające się (Losowe)",
    settings: "Ustawienia",
    account: "Konto",
    preferences: "Preferencje",
    newProject: "Nowy Projekt",
    quickStudy: "Szybka Nauka",
  },
}

// Default color palettes
const COLOR_PALETTES: Record<ColorTheme, ColorPalette> = {
  "indigo-purple": {
    name: "Indigo Purple",
    primary: { from: "from-indigo-600", to: "to-purple-700", text: "text-indigo-600", textDark: "dark:text-indigo-400" },
    secondary: { from: "from-purple-500", to: "to-pink-600", text: "text-purple-600", textDark: "dark:text-purple-400" },
    accent: { from: "from-pink-500", to: "to-rose-500", text: "text-pink-600", textDark: "dark:text-pink-400" },
    success: "text-green-600", error: "text-red-600", warning: "text-orange-600", info: "text-blue-600"
  },
  "blue-cyan": {
    name: "Ocean Blue",
    primary: { from: "from-blue-600", to: "to-cyan-500", text: "text-blue-600", textDark: "dark:text-blue-400" },
    secondary: { from: "from-cyan-500", to: "to-teal-500", text: "text-cyan-600", textDark: "dark:text-cyan-400" },
    accent: { from: "from-teal-500", to: "to-green-500", text: "text-teal-600", textDark: "dark:text-teal-400" },
    success: "text-emerald-600", error: "text-red-600", warning: "text-amber-600", info: "text-sky-600"
  },
  "green-emerald": {
    name: "Nature Green",
    primary: { from: "from-green-600", to: "to-emerald-600", text: "text-green-600", textDark: "dark:text-green-400" },
    secondary: { from: "from-emerald-500", to: "to-teal-500", text: "text-emerald-600", textDark: "dark:text-emerald-400" },
    accent: { from: "from-teal-500", to: "to-cyan-500", text: "text-teal-600", textDark: "dark:text-teal-400" },
    success: "text-green-600", error: "text-red-600", warning: "text-orange-600", info: "text-emerald-600"
  },
  "pink-rose": {
    name: "Romantic Pink",
    primary: { from: "from-pink-600", to: "to-rose-600", text: "text-pink-600", textDark: "dark:text-pink-400" },
    secondary: { from: "from-rose-500", to: "to-pink-500", text: "text-rose-600", textDark: "dark:text-rose-400" },
    accent: { from: "from-pink-500", to: "to-fuchsia-500", text: "text-pink-600", textDark: "dark:text-pink-400" },
    success: "text-green-600", error: "text-red-600", warning: "text-orange-600", info: "text-pink-600"
  },
  "orange-red": {
    name: "Sunset",
    primary: { from: "from-orange-600", to: "to-red-600", text: "text-orange-600", textDark: "dark:text-orange-400" },
    secondary: { from: "from-red-500", to: "to-pink-500", text: "text-red-600", textDark: "dark:text-red-400" },
    accent: { from: "from-pink-500", to: "to-rose-500", text: "text-red-600", textDark: "dark:text-red-400" },
    success: "text-green-600", error: "text-red-600", warning: "text-orange-600", info: "text-orange-600"
  },
  "teal-navy": {
    name: "Navy Professional",
    primary: { from: "from-teal-700", to: "to-blue-800", text: "text-teal-700", textDark: "dark:text-teal-300" },
    secondary: { from: "from-blue-800", to: "to-indigo-800", text: "text-blue-800", textDark: "dark:text-blue-300" },
    accent: { from: "from-indigo-700", to: "to-purple-700", text: "text-indigo-700", textDark: "dark:text-indigo-300" },
    success: "text-green-600", error: "text-red-600", warning: "text-orange-600", info: "text-teal-600"
  },
  "slate-professional": {
    name: "Minimal Professional",
    primary: { from: "from-slate-700", to: "to-slate-800", text: "text-slate-700", textDark: "dark:text-slate-300" },
    secondary: { from: "from-slate-600", to: "to-slate-700", text: "text-slate-600", textDark: "dark:text-slate-400" },
    accent: { from: "from-slate-500", to: "to-slate-600", text: "text-slate-600", textDark: "dark:text-slate-400" },
    success: "text-green-600", error: "text-red-600", warning: "text-orange-600", info: "text-blue-600"
  },
  "custom": {
    name: "Custom",
    primary: { from: "from-gray-600", to: "to-gray-700", text: "text-gray-600", textDark: "dark:text-gray-400" },
    secondary: { from: "from-gray-500", to: "to-gray-600", text: "text-gray-500", textDark: "dark:text-gray-300" },
    accent: { from: "from-gray-400", to: "to-gray-500", text: "text-gray-600", textDark: "dark:text-gray-400" },
    success: "text-green-600", error: "text-red-600", warning: "text-orange-600", info: "text-blue-600"
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  // Initialize state from localStorage if available, otherwise use defaults
  const [displayName, setDisplayName] = useState<string>("My Lord")
  const [menuDisplay, setMenuDisplay] = useState<string>("default")
  const [darkMode, setDarkMode] = useState<boolean>(false)
  const [greetingType, setGreetingType] = useState<GreetingType>("welcome")
  const [currentGreeting, setCurrentGreeting] = useState<string>("Welcome Back,")
  const [language, setLanguage] = useState<Language>("en")
  const [projects, setProjects] = useState<Project[]>([])
  const [deadlines, setDeadlines] = useState<Deadline[]>([])

  // Color system state
  const [colorSettings, setColorSettingsState] = useState<ColorSettings>({
    theme: "indigo-purple",
    useGradients: true,
    customPrimary: "#6366f1",
    customSecondary: "#8b5cf6"
  })

  const [customColors, setCustomColorsState] = useState<CustomColors>({
    primary: "#6366f1",
    secondary: "#8b5cf6",
    accent: "#ec4899"
  })

  // Function to update the current greeting based on the selected type
  const updateGreeting = useCallback(() => {
    if (greetingType === "alternating") {
      const randomIndex = Math.floor(Math.random() * greetings.length)
      setCurrentGreeting(greetings[randomIndex])
    } else {
      setCurrentGreeting(translations[language][greetingType])
    }
  }, [greetingType, language])

  // Function to refresh the greeting (useful for alternating mode)
  const refreshGreeting = useCallback(() => {
    if (greetingType === "alternating") {
      updateGreeting()
    }
  }, [greetingType, updateGreeting])

  // Load preferences from localStorage on initial render
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Load basic preferences
      const savedDarkMode = localStorage.getItem("darkMode")
      if (savedDarkMode !== null) setDarkMode(savedDarkMode === "true")

      const savedLanguage = localStorage.getItem("language") as Language
      if (savedLanguage && Object.keys(translations).includes(savedLanguage)) {
        setLanguage(savedLanguage)
      }

      const savedDisplayName = localStorage.getItem("displayName")
      if (savedDisplayName) setDisplayName(savedDisplayName)

      const savedGreetingType = localStorage.getItem("greetingType") as GreetingType
      if (savedGreetingType) setGreetingType(savedGreetingType)

      const savedMenuDisplay = localStorage.getItem("menuDisplay")
      if (savedMenuDisplay) setMenuDisplay(savedMenuDisplay)

      // Load projects
      const savedProjects = localStorage.getItem("projects")
      if (savedProjects) {
        try {
          setProjects(JSON.parse(savedProjects))
        } catch (e) {
          console.error("Failed to parse saved projects", e)
        }
      }

      // Load deadlines
      const savedDeadlines = localStorage.getItem("deadlines")
      if (savedDeadlines) {
        try {
          setDeadlines(JSON.parse(savedDeadlines))
        } catch (e) {
          console.error("Failed to parse saved deadlines", e)
        }
      }

      // Load color settings
      const savedColorSettings = localStorage.getItem("colorSettings")
      if (savedColorSettings) {
        try {
          setColorSettingsState(JSON.parse(savedColorSettings))
        } catch (e) {
          console.error("Failed to parse saved color settings", e)
        }
      }

      // Load custom colors
      const savedCustomColors = localStorage.getItem("customColors")
      if (savedCustomColors) {
        try {
          setCustomColorsState(JSON.parse(savedCustomColors))
        } catch (e) {
          console.error("Failed to parse saved custom colors", e)
        }
      }
    }
  }, [])

  // Save to localStorage effects
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("darkMode", darkMode.toString())
    }
  }, [darkMode])

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("language", language)
    }
  }, [language])

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("displayName", displayName)
    }
  }, [displayName])

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("greetingType", greetingType)
    }
  }, [greetingType])

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("menuDisplay", menuDisplay)
    }
  }, [menuDisplay])

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("projects", JSON.stringify(projects))
    }
  }, [projects])

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("deadlines", JSON.stringify(deadlines))
    }
  }, [deadlines])

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("colorSettings", JSON.stringify(colorSettings))
    }
  }, [colorSettings])

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("customColors", JSON.stringify(customColors))
    }
  }, [customColors])

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [darkMode])

  // Update greeting when greeting type or language changes
  useEffect(() => {
    updateGreeting()
  }, [greetingType, language, updateGreeting])

  // Translation function with parameter support
  const t = useCallback(
    (key: string, params?: Record<string, string>): string => {
      let text = translations[language][key] || key

      // Replace parameters if provided
      if (params) {
        Object.entries(params).forEach(([param, value]) => {
          text = text.replace(`{${param}}`, value)
        })
      }

      return text
    },
    [language],
  )

  // Add project functions
  const addProject = useCallback((project: Project) => {
    setProjects((prev) => [...prev, project])
  }, [])

  const removeProject = useCallback((id: number) => {
    setProjects((prev) => prev.filter((project) => project.id !== id))
  }, [])

  // Add deadline functions
  const addDeadline = useCallback((deadline: Deadline) => {
    setDeadlines((prev) => [...prev, deadline])
  }, [])

  const removeDeadline = useCallback((id: number) => {
    setDeadlines((prev) => prev.filter((deadline) => deadline.id !== id))
  }, [])

  // Color system functions
  const setColorSettings = useCallback((settings: ColorSettings) => {
    setColorSettingsState(settings)
  }, [])

  const setCustomColors = useCallback((colors: CustomColors) => {
    setCustomColorsState(colors)
  }, [])

  // Current palette computation
  const currentPalette = COLOR_PALETTES[colorSettings.theme] || COLOR_PALETTES["indigo-purple"]

  return (
    <PreferencesContext.Provider
      value={{
        displayName,
        setDisplayName,
        menuDisplay,
        setMenuDisplay,
        darkMode,
        setDarkMode,
        greetingType,
        setGreetingType,
        currentGreeting,
        refreshGreeting,
        language,
        setLanguage,
        t,
        projects,
        addProject,
        removeProject,
        deadlines,
        addDeadline,
        removeDeadline,
        colorSettings,
        setColorSettings,
        customColors,
        setCustomColors,
        currentPalette,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences() {
  const context = useContext(PreferencesContext)
  if (context === undefined) {
    throw new Error("usePreferences must be used within a PreferencesProvider")
  }
  return context
}