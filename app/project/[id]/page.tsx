"use client";
import { useAuth } from "@/context/auth/AuthContext";
import { useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Settings, Plus, FileText, GraduationCap, Book, Upload, X, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePreferences } from "@/context/preferences-context";
import { useRouter } from "next/navigation";
import { useProjects } from "@/context/projects-context";
import PDFReader from "@/components/pdf-reader/pdf-reader";
import ProjectNotes from "../[id]/project-notes/project-notes";
import ProjectTests from "../[id]/project-tests/project-tests"; // Zaimportuj nowy komponent
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";


export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { darkMode, t } = usePreferences();
  const { projects, fetchProjects } = useProjects();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [activePdfFile, setActivePdfFile] = useState<{
    fileId: number;
    fileUrl: string;
    fileName: string;
  } | null>(null);
  
  // Stany dla różnych widoków
  const [showNotesView, setShowNotesView] = useState(false);
  const [showTestsView, setShowTestsView] = useState(false); // Dodany nowy stan dla testów
  
  // Nowy stan dla modalu dodawania plików
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

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
    
    // Zamknij inne widoki, jeśli były otwarte
    setShowNotesView(false);
    setShowTestsView(false);
    
    // Otwórz PDF Reader
    setActivePdfFile({
      fileId,
      fileUrl: filePath,
      fileName,
    });
  };
  
  // Funkcja otwierająca widok notatek
  const openNotesView = () => {
    // Zamknij inne widoki, jeśli były otwarte
    setActivePdfFile(null);
    setShowTestsView(false);
    
    // Otwórz widok notatek
    setShowNotesView(true);
  };
  
  // Funkcja zamykająca widok notatek
  const closeNotesView = () => {
    setShowNotesView(false);
  };
  
  // Funkcja otwierająca widok testów
  const openTestsView = () => {
    // Zamknij inne widoki, jeśli były otwarte
    setActivePdfFile(null);
    setShowNotesView(false);
    
    // Otwórz widok testów
    setShowTestsView(true);
  };
  
  // Funkcja zamykająca widok testów
  const closeTestsView = () => {
    setShowTestsView(false);
  };

  // Obsługa zmiany plików
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFiles((prevFiles) => [...prevFiles, ...Array.from(files)]);
    }
  };

  // Usuwanie pliku z listy wybranych
  const removeFile = (index: number) => {
    setSelectedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  // Dodawanie nowych plików do projektu
  const handleUploadFiles = async () => {
    if (selectedFiles.length === 0) {
      toast({ 
        title: t("validationError"), 
        description: t("noFilesSelected"), 
        variant: "destructive" 
      });
      return;
    }

    try {
      setUploading(true);

      // Sprawdzamy czy mamy ID użytkownika
      if (!user?.id) {
        throw new Error("Brak identyfikatora użytkownika");
      }

      console.log("Uploading files:", selectedFiles);
      console.log("Project ID:", params.id);
      console.log("User ID:", user.id);

      const formData = new FormData();
      
      // Dodajemy WYMAGANE pola - user_id i project_id
      formData.append("user_id", user.id.toString());
      formData.append("project_id", params.id.toString());
      
      // Dodajemy pliki używając nazwy pola "attached_files" zgodnie z API
      selectedFiles.forEach((file) => {
        formData.append("attached_files", file);
      });

      // Debugowanie - sprawdzenie zawartości formData
      for (let pair of formData.entries()) {
        console.log(pair[0] + ': ' + (pair[1] instanceof File ? pair[1].name : pair[1]));
      }

      const response = await fetch("/api/projects/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Upload error response:", errorText);
        throw new Error(`File upload failed: ${response.status} ${errorText}`);
      }

      toast({ 
        title: t("uploadSuccess"), 
        description: t("filesAddedToProject") 
      });
      
      // Zamknij modal po sukcesie
      setShowUploadModal(false);
      setSelectedFiles([]);
      
      // Odśwież listę projektów, aby pokazać nowe pliki
      fetchProjects();
      
    } catch (error) {
      console.error("Upload error:", error);
      toast({ 
        title: t("uploadError"), 
        description: error instanceof Error ? error.message : t("fileUploadFailed"), 
        variant: "destructive" 
      });
    } finally {
      setUploading(false);
    }
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
              onClick={() => setShowUploadModal(true)}
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
            {/* Karta "Notes" - otwiera widok notatek */}
            <Card
              className={`group cursor-pointer transition-colors ${
                darkMode
                  ? "bg-slate-800 border-slate-700 hover:bg-slate-700"
                  : "bg-white hover:bg-gray-50"
              }`}
              onClick={openNotesView}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <GraduationCap className="h-8 w-8 text-indigo-500 shrink-0" />
                <div>
                  <p className="font-medium">{t("notes")}</p>
                  <p className="text-sm text-muted-foreground">{t("manageNotes")}</p>
                </div>
              </CardContent>
            </Card>

            {/* Karta "Tests" - otwiera widok testów */}
            <Card
              className={`group cursor-pointer transition-colors ${
                darkMode
                  ? "bg-slate-800 border-slate-700 hover:bg-slate-700"
                  : "bg-white hover:bg-gray-50"
              }`}
              onClick={openTestsView} // Dodane wywołanie funkcji otwierającej widok testów
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
      
      {/* Tests View Modal */}
      {showTestsView && (
        <ProjectTests
          projectId={Number(params.id)}
          onClose={closeTestsView}
        />
      )}

      {/* Modal dodawania plików */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div 
            className={`w-full max-w-lg rounded-lg ${
              darkMode ? "bg-slate-900 border-slate-700" : "bg-white"
            } border p-6 shadow-lg`}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{t("addNewMaterial")}</h2>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowUploadModal(false)}
                disabled={uploading}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("attachFiles")}</Label>
                <div 
                  className={`rounded-lg border border-dashed p-6 text-center ${
                    darkMode ? "border-slate-700 bg-slate-800" : ""
                  }`}
                >
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("dragAndDropFiles")}
                  </p>
                  <Input
                    id="files"
                    type="file"
                    multiple
                    className={`mt-4 ${darkMode ? "bg-slate-700" : ""}`}
                    onChange={handleFileChange}
                    disabled={uploading}
                    accept=".pdf"
                  />
                </div>
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <Label>{t("selectedFiles")}</Label>
                  <ul 
                    className={`rounded-md border p-2 max-h-40 overflow-y-auto ${
                      darkMode ? "border-slate-700 bg-slate-800" : ""
                    }`}
                  >
                    {selectedFiles.map((file, index) => (
                      <li key={index} className="flex items-center justify-between py-1">
                        <span className="text-sm truncate">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="h-6 w-6 p-0"
                          disabled={uploading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploading}
                >
                  {t("cancel")}
                </Button>
                <Button 
                  onClick={handleUploadFiles}
                  disabled={selectedFiles.length === 0 || uploading}
                  className="gap-2"
                >
                  {uploading ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploading ? t("uploading") : t("upload")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}