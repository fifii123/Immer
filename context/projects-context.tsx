"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface AttachedFile {
  file_id: number;
  file_name: string;
  uploaded_at: string;
}

interface Project {
  project_id: number;
  subject_name: string;
  note_preferences: string;
  attached_file?: AttachedFile[]; // Dodanie plików do projektu
}


interface ProjectsContextType {
  projects: Project[];
  selectedProjectId: number | null;
  setSelectedProjectId: (id: number | null) => void;
  fetchProjects: () => Promise<void>;
  removeProject: (id: number) => void;
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

export const ProjectsProvider = ({ children }: { children: React.ReactNode }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  // Funkcja do pobierania projektów z bazy danych
  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/projects/fetch", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch projects");
  
      const data: Project[] = await response.json();
      setProjects(data);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };
  

  const removeProject = async (id: number) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("Brak tokena. Użytkownik nie jest zalogowany.");
        return;
      }
  
      const response = await fetch(`/api/projects/delete/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Nie udało się usunąć projektu.");
      }
  
      setProjects((prev) => prev.filter((p) => p.project_id !== id));
      await fetchProjects();
    } catch (error) {
      console.error("Błąd podczas usuwania projektu:", error);
    }
  };
  
  

  // Pobierz projekty przy pierwszym renderowaniu
  useEffect(() => {
    fetchProjects();
  }, []);

  return (
    <ProjectsContext.Provider value={{ projects, selectedProjectId, setSelectedProjectId, fetchProjects, removeProject }}>
      {children}
    </ProjectsContext.Provider>
  );
};

export const useProjects = () => {
  const context = useContext(ProjectsContext);
  if (!context) throw new Error("useProjects must be used within a ProjectsProvider");
  return context;
};