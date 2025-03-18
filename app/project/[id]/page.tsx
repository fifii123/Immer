"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Settings, Plus, FileText, GraduationCap, Book } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePreferences } from "@/context/preferences-context";
import { useRouter } from "next/navigation";
import { useProjects } from "@/context/projects-context";
import PDFReader from "@/components/pdf-reader/pdf-reader"; // Zaimportuj komponent czytnika PDF
import ProjectNotes from "../[id]/project-notes/project-notes"; // Zaimportuj komponent widoku notatek

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { darkMode, t } = usePreferences();
  const { projects } = useProjects();
  const [activePdfFile, setActivePdfFile] = useState<{
    fileId: number;
    fileUrl: string;
    fileName: string;
  } | null>(null);
  
  // Dodany nowy stan dla widoku notatek
  const [showNotesView, setShowNotesView] = useState(false);

  // Find the current project
  const project = projects.find((p) => p.project_id.toString() === params.id);

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{t("projectNotFound")}</h1>
          <Button className="mt-4" onClick={() => router.push("/")}>
            {t("backToProjects")}
          </Button>
        </div>
      </div>
    );
  }

  // Funkcja otwierająca PDF w interaktywnym czytniku
  const openPdfReader = (fileId: number, filePath: string, fileName: string) => {
    console.log(`File ID: ${fileId}, URL: ${filePath}`);
    
    // Zamknij widok notatek, jeśli był otwarty
    setShowNotesView(false);
    
    // Otwórz PDF Reader
    setActivePdfFile({
      fileId,
      fileUrl: filePath,
      fileName,
    });
  };
  
  // Funkcja otwierająca widok notatek
  const openNotesView = () => {
    // Zamknij PDF Reader, jeśli był otwarty
    setActivePdfFile(null);
    
    // Otwórz widok notatek
    setShowNotesView(true);
  };
  
  // Funkcja zamykająca widok notatek
  const closeNotesView = () => {
    setShowNotesView(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header
        className={`sticky top-0 z-10 border-b ${
          darkMode ? "bg-slate-900 border-slate-700" : "bg-white"
        }`}
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-7xl">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold">{project.subject_name}</h1>
              {project.note_preferences && (
                <p className="text-sm text-muted-foreground">
                  {project.note_preferences}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label={t("settings")}>
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        {/* Materials Section */}
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-semibold">{t("materials")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {project.attached_file?.map((file) => (
              <Card
                key={file.file_id}
                className={`group relative cursor-pointer transition-colors ${
                  darkMode
                    ? "bg-slate-800 border-slate-700 hover:bg-slate-700"
                    : "bg-white hover:bg-gray-50"
                }`}
                onClick={() => openPdfReader(file.file_id, file.file_path, file.file_name)}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <FileText className="h-8 w-8 text-blue-500 shrink-0" />
                  <div className="flex-1 truncate">
                    <p className="font-medium truncate">{file.file_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      ID: {file.file_id}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card
              className={`group cursor-pointer transition-colors ${
                darkMode
                  ? "bg-slate-800 border-slate-700 hover:bg-slate-700"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              <CardContent className="flex h-full items-center justify-center gap-2 p-4">
                <Plus className="h-5 w-5" />
                <span>{t("addNewMaterial")}</span>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Open Resources Section */}
        <section>
          <h2 className="mb-4 text-lg font-semibold">{t("openResources")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Karta "Notes" - otwiera nowy widok notatek */}
            <Card
              className={`group cursor-pointer transition-colors ${
                darkMode
                  ? "bg-slate-800 border-slate-700 hover:bg-slate-700"
                  : "bg-white hover:bg-gray-50"
              }`}
              onClick={openNotesView} // Teraz otwiera nowy widok notatek
            >
              <CardContent className="flex items-center gap-3 p-4">
                <GraduationCap className="h-8 w-8 text-indigo-500 shrink-0" />
                <div>
                  <p className="font-medium">{t("notes")}</p>
                  <p className="text-sm text-muted-foreground">{t("manageNotes")}</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`group cursor-pointer transition-colors ${
                darkMode
                  ? "bg-slate-800 border-slate-700 hover:bg-slate-700"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <FileText className="h-8 w-8 text-emerald-500 shrink-0" />
                <div>
                  <p className="font-medium">{t("tests")}</p>
                  <p className="text-sm text-muted-foreground">{t("manageTests")}</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`group cursor-pointer transition-colors ${
                darkMode
                  ? "bg-slate-800 border-slate-700 hover:bg-slate-700"
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <Book className="h-8 w-8 text-rose-500 shrink-0" />
                <div>
                  <p className="font-medium">{t("glossary")}</p>
                  <p className="text-sm text-muted-foreground">{t("manageGlossary")}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* PDF Reader Modal */}
      {activePdfFile && (
        <PDFReader
          fileUrl={activePdfFile.fileUrl}
          fileName={activePdfFile.fileName}
          fileId={activePdfFile.fileId}
          onClose={() => setActivePdfFile(null)}
        />
      )}
      
      {/* Notes View Modal */}
      {showNotesView && (
        <ProjectNotes
          projectId={Number(params.id)}
          onClose={closeNotesView}
        />
      )}
    </div>
  );
}