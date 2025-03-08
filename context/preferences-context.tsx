"use client"

import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from "react"

// Define greeting types
export type GreetingType = "welcome" | "hello" | "goodToSeeYou" | "greetings" | "howdy" | "heyThere" | "alternating"

// Define language types
export type Language = "en" | "de" | "es" | "fr" | "pl"

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

    // Alma Mater dialog
    canBeUpdated: "can be updated",
    enterAcademicInfo: "Enter your academic information",
    universityAndYear: "University You Attend + Year of Study (Optional):",
    universityPlaceholder: "e.g., Harvard University, Year 3",
    majorDegree: "What is your Major/Degree Program? (Eg. Law, IT)",
    majorPlaceholder: "Enter your major or degree program",
    currentCourses: "Subjects/Courses You are taking this semester:",
    enterCourseName: "Enter course name",
    attached: "Attached",
    addCourse: "Add Course",
    academicInfoSaved: "Academic information saved",
    almaMaterUpdated: "Your Alma Mater details have been updated successfully.",

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
    // Statistics section
    completionRate: "Completion Rate",
    completed: "Completed",
    inProgress: "In Progress",
    recentActivity: "Recent Activity",
    upcomingDeadlines: "Upcoming Deadlines",
    noUpcomingDeadlines: "No upcoming deadlines",
    comingSoon: "Coming Soon",
    statisticsComingSoon: "Detailed project statistics will be available in a future update.",
    noRecentActivity: "No Recent Activity",
    createProjectToSeeActivity: "Create your first project to see activity here.",
    addDeadline: "Add Deadline",
    deadlinesCalendar: "Deadlines Calendar",
    calendar: "Calendar",
    addDeadlineForDate: "Add Deadline for This Date",
    deadlineTitle: "Title",
    deadlineDate: "Date",
    enterDeadlineTitle: "Enter deadline title",
    selectDate: "Select a date",
    selectProject: "Select a project",
    optional: "Optional",
    deadlineAdded: "Deadline Added",
    deadlineAddedDescription: "Your deadline has been added successfully.",
    noDeadlinesForDate: "No deadlines for this date",
    deadlineTitleRequired: "Deadline title is required",
    deadlineDateRequired: "Deadline date is required",
    today: "Today",
    tomorrow: "Tomorrow",
    viewCalendar: "View Calendar",
    addDeadlineDescription: "Add a new deadline to your calendar.",
  },
  de: {
    // Greetings
    welcome: "Willkommen zurück,",
    hello: "Hallo,",
    goodToSeeYou: "Schön dich zu sehen,",
    greetings: "Grüße,",
    howdy: "Howdy,",
    heyThere: "Hey du,",
    welcomeBack: "Willkommen zurück",
    alternating: "Wechselnd (Zufällig)",

    // Navigation
    settings: "Einstellungen",
    account: "Konto",
    preferences: "Präferenzen",
    almaMater: "Alma Mater",
    logout: "Abmelden",

    // Action buttons
    statistics: "Statistiken",
    newProject: "Neues Projekt",
    resources: "Ressourcen",

    // Project list
    allProjects: "Alle Projekte",
    subjects: "Fächer",
    catalogs: "Kataloge",
    searchProjects: "Projekte suchen...",
    noProjects: "Noch keine Projekte",
    noProjectsDescription: "Erstellen Sie Ihr erstes Projekt, um mit der Organisation Ihrer Arbeit zu beginnen.",
    createFirstProject: "Erstellen Sie Ihr erstes Projekt",
    editProject: "Projekt bearbeiten",
    deleteProject: "Projekt löschen",
    confirmDelete: "Löschen bestätigen",
    deleteProjectConfirmation:
      "Sind Sie sicher, dass Sie das Projekt '{projectName}' löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.",
    delete: "Löschen",

    // Language settings
    language: "Sprache",
    english: "Englisch",
    german: "Deutsch",
    spanish: "Spanisch",
    french: "Französisch",
    polish: "Polnisch",
    languageUpdated: "Sprache aktualisiert",
    languagePreferenceSaved: "Ihre Spracheinstellung wurde gespeichert.",

    // Preferences dialog
    customizeExperience: "Passen Sie Ihre Erfahrung an",
    howToReferToYou: "Wie sollen wir Sie ansprechen?",
    enterPreferredName: "Geben Sie Ihren bevorzugten Namen oder Titel ein",
    greetingStyle: "Begrüßungsstil",
    chooseGreetingStyle: "Begrüßungsstil wählen",
    mainMenuDisplay: "Hauptmenü-Anzeige",
    chooseOption: "Option wählen",
    additionalSettings: "Zusätzliche Einstellungen",
    darkMode: "Dunkelmodus",
    emailNotifications: "E-Mail-Benachrichtigungen",
    preferencesSaved: "Einstellungen gespeichert",
    preferencesUpdated: "Ihre Einstellungen wurden erfolgreich aktualisiert.",

    // Alma Mater dialog
    canBeUpdated: "kann aktualisiert werden",
    enterAcademicInfo: "Geben Sie Ihre akademischen Informationen ein",
    universityAndYear: "Universität, die Sie besuchen + Studienjahr (Optional):",
    universityPlaceholder: "z.B. Universität Berlin, Jahr 3",
    majorDegree: "Was ist Ihr Hauptfach/Studiengang? (z.B. Jura, IT)",
    majorPlaceholder: "Geben Sie Ihr Hauptfach oder Ihren Studiengang ein",
    currentCourses: "Fächer/Kurse, die Sie dieses Semester belegen:",
    enterCourseName: "Kursname eingeben",
    attached: "Angehängt",
    addCourse: "Kurs hinzufügen",
    academicInfoSaved: "Akademische Informationen gespeichert",
    almaMaterUpdated: "Ihre Alma Mater-Details wurden erfolgreich aktualisiert.",

    // Buttons
    save: "Änderungen speichern",
    submit: "Absenden",
    cancel: "Abbrechen",
    createNewProject: "Neues Projekt erstellen",
    subject: "Fach",
    enterSubject: "Fach eingeben (z.B. Biologie, Mathematik)",
    projectName: "Projektname",
    enterProjectName: "Projektname eingeben",
    attachFiles: "Dateien anhängen",
    dragAndDropFiles: "Dateien hier ablegen",
    orClickToUpload: "oder klicken zum Hochladen",
    attachedFiles: "Angehängte Dateien",
    createProject: "Projekt erstellen",
    back: "Zurück",
    projectCreated: "Projekt erstellt",
    projectCreatedDescription: "Ihr Projekt wurde erfolgreich erstellt.",
    validationError: "Validierungsfehler",
    projectNameRequired: "Projektname ist erforderlich",

    // Project page
    materials: "Materialien",
    addNewMaterial: "Neues Material hinzufügen",
    openResources: "Ressourcen öffnen",
    notes: "Notizen",
    tests: "Tests",
    glossary: "Glossar",
    manageNotes: "Verwalten Sie Ihre Projektnotizen",
    manageTests: "Verfolgen Sie Ihren Fortschritt",
    manageGlossary: "Schlüsselbegriffe und Definitionen",
    projectNotFound: "Projekt nicht gefunden",
    backToProjects: "Zurück zu den Projekten",
  },
  es: {
    // Greetings
    welcome: "Bienvenido de nuevo,",
    hello: "Hola,",
    goodToSeeYou: "Gusto en verte,",
    greetings: "Saludos,",
    howdy: "Hola,",
    heyThere: "Oye,",
    welcomeBack: "Bienvenido de nuevo",
    alternating: "Alternando (Aleatorio)",

    // Navigation
    settings: "Configuración",
    account: "Cuenta",
    preferences: "Preferencias",
    almaMater: "Alma Mater",
    logout: "Cerrar sesión",

    // Action buttons
    statistics: "Estadísticas",
    newProject: "Nuevo Proyecto",
    resources: "Recursos",

    // Project list
    allProjects: "Todos los Proyectos",
    subjects: "Asignaturas",
    catalogs: "Catálogos",
    searchProjects: "Buscar proyectos...",
    noProjects: "Aún no hay proyectos",
    noProjectsDescription: "Crea tu primer proyecto para comenzar a organizar tu trabajo.",
    createFirstProject: "Crear tu primer proyecto",
    editProject: "Editar proyecto",
    deleteProject: "Eliminar proyecto",
    confirmDelete: "Confirmar eliminación",
    deleteProjectConfirmation:
      "¿Estás seguro de que quieres eliminar el proyecto '{projectName}'? Esta acción no se puede deshacer.",
    delete: "Eliminar",

    // Language settings
    language: "Idioma",
    english: "Inglés",
    german: "Alemán",
    spanish: "Español",
    french: "Francés",
    polish: "Polaco",
    languageUpdated: "Idioma actualizado",
    languagePreferenceSaved: "Tu preferencia de idioma ha sido guardada.",

    // Preferences dialog
    customizeExperience: "Personaliza tu experiencia",
    howToReferToYou: "¿Cómo referirse a ti?",
    enterPreferredName: "Ingresa tu nombre o título preferido",
    greetingStyle: "Estilo de Saludo",
    chooseGreetingStyle: "Elige estilo de saludo",
    mainMenuDisplay: "Visualización del Menú Principal",
    chooseOption: "Elige Opción",
    additionalSettings: "Configuraciones Adicionales",
    darkMode: "Modo Oscuro",
    emailNotifications: "Notificaciones por Correo",
    preferencesSaved: "Preferencias guardadas",
    preferencesUpdated: "Tus preferencias han sido actualizadas con éxito.",

    // Alma Mater dialog
    canBeUpdated: "puede ser actualizado",
    enterAcademicInfo: "Ingresa tu información académica",
    universityAndYear: "Universidad a la que asistes + Año de estudio (Opcional):",
    universityPlaceholder: "ej., Universidad de Barcelona, Año 3",
    majorDegree: "¿Cuál es tu carrera/programa de grado? (Ej. Derecho, TI)",
    majorPlaceholder: "Ingresa tu carrera o programa de grado",
    currentCourses: "Asignaturas/Cursos que estás tomando este semestre:",
    enterCourseName: "Ingresa nombre del curso",
    attached: "Adjunto",
    addCourse: "Añadir Curso",
    academicInfoSaved: "Información académica guardada",
    almaMaterUpdated: "Los detalles de tu Alma Mater han been actualizados con éxito.",

    // Buttons
    save: "Guardar Cambios",
    submit: "Enviar",
    cancel: "Cancelar",
    createNewProject: "Crear Nuevo Proyecto",
    subject: "Asignatura",
    enterSubject: "Introduce la asignatura (ej., Biología, Matemáticas)",
    projectName: "Nombre del Proyecto",
    enterProjectName: "Introduce el nombre del proyecto",
    attachFiles: "Adjuntar Archivos",
    dragAndDropFiles: "Arrastra y suelta los archivos aquí",
    orClickToUpload: "o haz clic para subir",
    attachedFiles: "Archivos Adjuntos",
    createProject: "Crear Proyecto",
    back: "Atrás",
    projectCreated: "Proyecto creado",
    projectCreatedDescription: "Tu proyecto ha sido creado con éxito.",
    validationError: "Error de validación",
    projectNameRequired: "El nombre del proyecto es obligatorio",

    // Project page
    materials: "Materiales",
    addNewMaterial: "Añadir nuevo material",
    openResources: "Abrir recursos",
    notes: "Notas",
    tests: "Pruebas",
    glossary: "Glosario",
    manageNotes: "Gestiona tus notas del proyecto",
    manageTests: "Haz seguimiento de tu progreso",
    manageGlossary: "Términos y definiciones clave",
    projectNotFound: "Proyecto no encontrado",
    backToProjects: "Volver a Proyectos",
  },
  fr: {
    // Greetings
    welcome: "Bon retour,",
    hello: "Bonjour,",
    goodToSeeYou: "Ravi de te voir,",
    greetings: "Salutations,",
    howdy: "Salut,",
    heyThere: "Hé toi,",
    welcomeBack: "Bon retour",
    alternating: "Alternant (Aléatoire)",

    // Navigation
    settings: "Paramètres",
    account: "Compte",
    preferences: "Préférences",
    almaMater: "Alma Mater",
    logout: "Déconnexion",

    // Action buttons
    statistics: "Statistiques",
    newProject: "Nouveau Projet",
    resources: "Ressources",

    // Project list
    allProjects: "Tous les Projets",
    subjects: "Sujets",
    catalogs: "Catalogues",
    searchProjects: "Rechercher des projets...",
    noProjects: "Pas encore de projets",
    noProjectsDescription: "Créez votre premier projet pour commencer à organiser votre travail.",
    createFirstProject: "Créer votre premier projet",
    editProject: "Modifier le projet",
    deleteProject: "Supprimer le projet",
    confirmDelete: "Confirmer la suppression",
    deleteProjectConfirmation:
      "Êtes-vous sûr de vouloir supprimer le projet '{projectName}' ? Cette action ne peut pas être annulée.",
    delete: "Supprimer",

    // Language settings
    language: "Langue",
    english: "Anglais",
    german: "Allemand",
    spanish: "Espagnol",
    french: "Français",
    polish: "Polonais",
    languageUpdated: "Langue mise à jour",
    languagePreferenceSaved: "Votre préférence linguistique a été enregistrée.",

    // Preferences dialog
    customizeExperience: "Personnalisez votre expérience",
    howToReferToYou: "Comment vous appeler ?",
    enterPreferredName: "Entrez votre nom ou titre préféré",
    greetingStyle: "Style de Salutation",
    chooseGreetingStyle: "Choisir le style de salutation",
    mainMenuDisplay: "Affichage du Menu Principal",
    chooseOption: "Choisir une Option",
    additionalSettings: "Paramètres Supplémentaires",
    darkMode: "Mode Sombre",
    emailNotifications: "Notifications par Email",
    preferencesSaved: "Préférences enregistrées",
    preferencesUpdated: "Vos préférences ont été mises à jour avec succès.",

    // Alma Mater dialog
    canBeUpdated: "peut être mis à jour",
    enterAcademicInfo: "Entrez vos informations académiques",
    universityAndYear: "Université que vous fréquentez + Année d'étude (Optionnel) :",
    universityPlaceholder: "ex., Université de Paris, Année 3",
    majorDegree: "Quelle est votre spécialité/programme de diplôme ? (Ex. Droit, IT)",
    majorPlaceholder: "Entrez votre spécialité ou programme de diplôme",
    currentCourses: "Matières/Cours que vous suivez ce semestre :",
    enterCourseName: "Entrez le nom du cours",
    attached: "Attaché",
    addCourse: "Ajouter un Cours",
    academicInfoSaved: "Informations académiques enregistrées",
    almaMaterUpdated: "Les détails de votre Alma Mater ont été mis à jour avec succès.",

    // Buttons
    save: "Enregistrer les modifications",
    submit: "Soumettre",
    cancel: "Annuler",
    createNewProject: "Créer un nouveau projet",
    subject: "Matière",
    enterSubject: "Entrez la matière (ex. Biologie, Mathématiques)",
    projectName: "Nom du projet",
    enterProjectName: "Entrez le nom du projet",
    attachFiles: "Joindre des fichiers",
    dragAndDropFiles: "Glissez-déposez les fichiers ici",
    orClickToUpload: "ou cliquez pour télécharger",
    attachedFiles: "Fichiers joints",
    createProject: "Créer le projet",
    back: "Retour",
    projectCreated: "Projet créé",
    projectCreatedDescription: "Votre projet a été créé avec succès.",
    validationError: "Erreur de validation",
    projectNameRequired: "Le nom du projet est requis",

    // Project page
    materials: "Matériaux",
    addNewMaterial: "Ajouter un nouveau matériau",
    openResources: "Ouvrir les ressources",
    notes: "Notes",
    tests: "Tests",
    glossary: "Glossaire",
    manageNotes: "Gérez vos notes de projet",
    manageTests: "Suivez votre progression",
    manageGlossary: "Termes et définitions clés",
    projectNotFound: "Projet introuvable",
    backToProjects: "Retour aux projets",
  },
  pl: {
    // Greetings
    welcome: "Witaj ponownie,",
    hello: "Cześć,",
    goodToSeeYou: "Miło Cię widzieć,",
    greetings: "Pozdrowienia,",
    howdy: "Hej,",
    heyThere: "Hej tam,",
    welcomeBack: "Witaj ponownie",
    alternating: "Zmieniające się (Losowe)",

    // Navigation
    settings: "Ustawienia",
    account: "Konto",
    preferences: "Preferencje",
    almaMater: "Alma Mater",
    logout: "Wyloguj",

    // Action buttons
    statistics: "Statystyki",
    newProject: "Nowy Projekt",
    resources: "Zasoby",

    // Project list
    allProjects: "Wszystkie Projekty",
    subjects: "Przedmioty",
    catalogs: "Katalogi",
    searchProjects: "Szukaj projektów...",
    noProjects: "Brak projektów",
    noProjectsDescription: "Utwórz swój pierwszy projekt, aby rozpocząć organizację swojej pracy.",
    createFirstProject: "Utwórz swój pierwszy projekt",
    editProject: "Edytuj projekt",
    deleteProject: "Usuń projekt",
    confirmDelete: "Potwierdź usunięcie",
    deleteProjectConfirmation: "Czy na pewno chcesz usunąć projekt '{projectName}'? Tej akcji nie można cofnąć.",
    delete: "Usuń",

    // Language settings
    language: "Język",
    english: "Angielski",
    german: "Niemiecki",
    spanish: "Hiszpański",
    french: "Francuski",
    polish: "Polski",
    languageUpdated: "Język zaktualizowany",
    languagePreferenceSaved: "Twoje preferencje językowe zostały zapisane.",

    // Preferences dialog
    customizeExperience: "Dostosuj swoje doświadczenie",
    howToReferToYou: "Jak się do Ciebie zwracać?",
    enterPreferredName: "Wprowadź preferowane imię lub tytuł",
    greetingStyle: "Styl Powitania",
    chooseGreetingStyle: "Wybierz styl powitania",
    mainMenuDisplay: "Wyświetlanie Menu Głównego",
    chooseOption: "Wybierz Opcję",
    additionalSettings: "Dodatkowe Ustawienia",
    darkMode: "Tryb Ciemny",
    emailNotifications: "Powiadomienia Email",
    preferencesSaved: "Preferencje zapisane",
    preferencesUpdated: "Twoje preferencje zostały pomyślnie zaktualizowane.",

    // Alma Mater dialog
    canBeUpdated: "może być aktualizowane",
    enterAcademicInfo: "Wprowadź swoje informacje akademickie",
    universityAndYear: "Uczelnia, którą uczęszczasz + Rok studiów (Opcjonalnie):",
    universityPlaceholder: "np., Uniwersytet Warszawski, Rok 3",
    majorDegree: "Jaki jest Twój kierunek/program studiów? (Np. Prawo, IT)",
    majorPlaceholder: "Wprowadź swój kierunek lub program studiów",
    currentCourses: "Przedmioty/Kursy, które realizujesz w tym semestrze:",
    enterCourseName: "Wprowadź nazwę kursu",
    attached: "Załączono",
    addCourse: "Dodaj Kurs",
    academicInfoSaved: "Informacje akademickie zapisane",
    almaMaterUpdated: "Twoje dane Alma Mater zostały pomyślnie zaktualizowane.",

    // Buttons
    save: "Zapisz zmiany",
    submit: "Wyślij",
    cancel: "Anuluj",
    createNewProject: "Utwórz nowy projekt",
    subject: "Przedmiot",
    enterSubject: "Wprowadź przedmiot (np. Biologia, Matematyka)",
    projectName: "Nazwa projektu",
    enterProjectName: "Wprowadź nazwę projektu",
    attachFiles: "Dołącz pliki",
    dragAndDropFiles: "Przeciągnij i upuść pliki tutaj",
    orClickToUpload: "lub kliknij, aby przesłać",
    attachedFiles: "Dołączone pliki",
    createProject: "Utwórz projekt",
    back: "Wstecz",
    projectCreated: "Projekt utworzony",
    projectCreatedDescription: "Twój projekt został pomyślnie utworzony.",
    validationError: "Błąd walidacji",
    projectNameRequired: "Nazwa projektu jest wymagana",

    // Project page
    materials: "Materiały",
    addNewMaterial: "Dodaj nowy materiał",
    openResources: "Otwórz zasoby",
    notes: "Notatki",
    tests: "Testy",
    glossary: "Słownik",
    manageNotes: "Zarządzaj notatkami projektu",
    manageTests: "Śledź swój postęp",
    manageGlossary: "Kluczowe terminy i definicje",
    projectNotFound: "Projekt nie znaleziony",
    backToProjects: "Wróć do projektów",
  },
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

  // Function to update the current greeting based on the selected type
  const updateGreeting = useCallback(() => {
    if (greetingType === "alternating") {
      // For alternating, we'll still use English greetings for variety
      const randomIndex = Math.floor(Math.random() * greetings.length)
      setCurrentGreeting(greetings[randomIndex])
    } else {
      // For specific greetings, use the translated version
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
    // Check if we're in a browser environment (not during SSR)
    if (typeof window !== "undefined") {
      // Load dark mode preference
      const savedDarkMode = localStorage.getItem("darkMode")
      if (savedDarkMode !== null) {
        setDarkMode(savedDarkMode === "true")
      }

      // Load language preference
      const savedLanguage = localStorage.getItem("language") as Language
      if (savedLanguage && Object.keys(translations).includes(savedLanguage)) {
        setLanguage(savedLanguage)
      }

      // Load display name
      const savedDisplayName = localStorage.getItem("displayName")
      if (savedDisplayName) {
        setDisplayName(savedDisplayName)
      }

      // Load greeting type
      const savedGreetingType = localStorage.getItem("greetingType") as GreetingType
      if (savedGreetingType) {
        setGreetingType(savedGreetingType)
      }

      // Load menu display
      const savedMenuDisplay = localStorage.getItem("menuDisplay")
      if (savedMenuDisplay) {
        setMenuDisplay(savedMenuDisplay)
      }

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
    }
  }, [])

  // Save dark mode preference to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("darkMode", darkMode.toString())
    }
  }, [darkMode])

  // Save language preference to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("language", language)
    }
  }, [language])

  // Save display name to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("displayName", displayName)
    }
  }, [displayName])

  // Save greeting type to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("greetingType", greetingType)
    }
  }, [greetingType])

  // Save menu display to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("menuDisplay", menuDisplay)
    }
  }, [menuDisplay])

  // Save projects to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("projects", JSON.stringify(projects))
    }
  }, [projects])

  // Save deadlines to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("deadlines", JSON.stringify(deadlines))
    }
  }, [deadlines])

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

