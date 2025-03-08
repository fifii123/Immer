"use client"

import type React from "react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "react-hot-toast"
import { Dialog, DialogContent, DialogTitle, DialogActions, Button, TextField, Typography, Stack } from "@mui/material"
import { AddCircleOutline } from "@mui/icons-material"
import { useDropzone } from "react-dropzone"
import type { Project } from "../../types/Project"

interface NewProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  addProject: (project: Project) => void
}

const NewProjectDialog: React.FC<NewProjectDialogProps> = ({ open, onOpenChange, addProject }) => {
  const { t } = useTranslation()
  const [projectName, setProjectName] = useState("")
  const [subject, setSubject] = useState("")
  const [error, setError] = useState("")
  const [attachedFiles, setAttachedFiles] = useState<any[]>([])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      setAttachedFiles(acceptedFiles)
    },
  })

  const handleCreateProject = (event: React.FormEvent) => {
    event.preventDefault()

    if (!projectName.trim()) {
      setError(t("projectNameRequired"))
      return
    }

    // Create a new project with current timestamp
    const newProject = {
      id: Date.now(),
      name: projectName,
      subject: subject,
      date: new Date().toLocaleDateString(),
      timestamp: Date.now(), // Add timestamp
      files: attachedFiles,
    }

    addProject(newProject)

    toast({
      title: t("projectCreated"),
      description: t("projectCreatedDescription"),
    })

    // Reset form
    setProjectName("")
    setSubject("")
    setAttachedFiles([])
    setError("")

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onClose={() => onOpenChange(false)}>
      <DialogTitle>
        <AddCircleOutline />
        {t("newProject")}
      </DialogTitle>
      <DialogContent>
        <form onSubmit={handleCreateProject}>
          <Stack spacing={2}>
            <TextField
              label={t("projectName")}
              variant="outlined"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              error={!!error}
              helperText={error}
              fullWidth
            />
            <TextField
              label={t("subject")}
              variant="outlined"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              fullWidth
            />
            <div {...getRootProps()}>
              <input {...getInputProps()} />
              {isDragActive ? (
                <Typography variant="body2">{t("dropFilesHere")}</Typography>
              ) : (
                <Typography variant="body2">{t("dragAndDropFiles")}</Typography>
              )}
            </div>
            {attachedFiles.length > 0 && (
              <Typography variant="body2">
                {t("filesAttached")}: {attachedFiles.map((file: any) => file.name).join(", ")}
              </Typography>
            )}
          </Stack>
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
        <Button type="submit" onClick={handleCreateProject} color="primary">
          {t("create")}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default NewProjectDialog

