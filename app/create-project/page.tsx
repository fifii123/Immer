"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { usePreferences } from "@/context/preferences-context";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuth } from '../../context/auth/AuthContext';

export default function CreateProjectPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t, addProject } = usePreferences();
  const {user} = useAuth();

  const [formData, setFormData] = useState({
    subject: "",
    projectName: t("newProject") + "1",
    files: [] as File[],
  });

  useEffect(() => {
    if (formData.subject) {
      setFormData((prev) => ({
        ...prev,
        projectName: formData.subject + "1",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        projectName: t("newProject") + "1",
      }));
    }
  }, [formData.subject, t]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: FileList | null = e.target.files;
    if (files && files.length > 0) {
      setFormData((prev) => ({
        ...prev,
        files: [...prev.files, ...Array.from(files)],
      }));
    }
  };
  
  

  const removeFile = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectName.trim()) {
      toast({ title: t("validationError"), description: t("projectNameRequired"), variant: "destructive" });
      return;
    }
  
    const uploadData = new FormData();
    uploadData.append("subject_name", formData.subject);
    uploadData.append("user_id", user?.id?.toString() || "");

    formData.files.forEach((file) => uploadData.append("attached_files", file));
  
    try {
      const response = await fetch("/api/projects/create", {
        method: "POST",
        body: uploadData,
      });
  
      if (!response.ok) throw new Error("Upload failed");
  
      const result = await response.json();
      toast({ title: t("projectCreated"), description: `Project ID: ${result.projectId}` });
  
      // Możesz dodać przekierowanie lub aktualizację listy projektów
      router.push("/");
    } catch (error) {
      toast({ title: "Error", description: "File upload failed", variant: "destructive" });
    }
  };
  

  return (
    <SidebarProvider>
      <div className="container mx-auto max-w-4xl py-8 px-4 sm:px-6">
        <div className="mb-6 flex items-center">
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => router.push("/")}> 
            <ArrowLeft className="h-4 w-4" /> {t("back")}
          </Button>
        </div>
        <div className="rounded-lg border p-6 dark:border-slate-700 dark:bg-slate-900">
          <h1 className="mb-6 text-2xl font-bold dark:text-white">{t("createNewProject")}</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject" className="dark:text-white">{t("subject")}</Label>
                <Input id="subject" value={formData.subject} onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))} placeholder={t("enterSubject")} className="dark:bg-slate-800 dark:text-white dark:border-slate-700" />
              </div>
              <div className="space-y-2">
                <Label>{t("attachFiles")}</Label>
                <div className="rounded-lg border border-dashed p-6 text-center dark:border-slate-700 dark:bg-slate-800">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">{t("dragAndDropFiles")}</p>
                  <Input id="files" type="file" multiple className="mt-4 dark:bg-slate-700" onChange={handleFileChange} />
                </div>
                {formData.files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <Label className="dark:text-white">{t("attachedFiles")}</Label>
                    <ul className="rounded-md border p-2 dark:border-slate-700 dark:bg-slate-800">
                      {formData.files.map((file, index) => (
                        <li key={index} className="flex items-center justify-between py-1">
                          <span className="text-sm dark:text-white">{file.name}</span>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(index)} className="h-6 w-6 p-0">
                            <ArrowLeft className="h-4 w-4 rotate-45" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            <Button type="submit" className="gap-2">
              <Save className="h-4 w-4" /> {t("createProject")}
            </Button>
          </form>
        </div>
      </div>
    </SidebarProvider>
  );
}
