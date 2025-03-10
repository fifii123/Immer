"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface Project {
  project_id: number;
  subject_name: string;
  note_preferences: string;
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
      const token = localStorage.getItem("token"); // Pobierz token z localStorage
      const response = await fetch("/api/projects/fetch", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch projects");
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  // Funkcja do usuwania projektu
  const removeProject = async (id: number) => {
    try {
      const token = localStorage.getItem("token"); // Pobierz token z localStorage
      const response = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to delete project");
      await fetchProjects(); // Ponowne pobranie projektów po usunięciu
    } catch (error) {
      console.error("Error deleting project:", error);
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