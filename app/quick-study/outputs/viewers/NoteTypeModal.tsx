"use client"

import React, { useState } from 'react'
import { 
  PenTool,
  FileText,
  List,
  Table,
  Check,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface NoteType {
  id: string
  title: string
  description: string
  icon: React.ReactNode
}

interface NoteTypeModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (noteType: string) => void
  generating: boolean
}

const noteTypes: NoteType[] = [
  {
    id: 'general',
    title: 'Standard Notes',
    description: 'Complete sections with definitions',
    icon: <PenTool className="h-4 w-4" />
  },
  {
    id: 'key-points',
    title: 'Key Points',
    description: 'Essential terms and concepts',
    icon: <List className="h-4 w-4" />
  },
  {
    id: 'structured',
    title: 'Structured',
    description: 'Numbered sections and hierarchy',
    icon: <FileText className="h-4 w-4" />
  },
  {
    id: 'summary-table',
    title: 'Tables',
    description: 'Organized data and comparisons',
    icon: <Table className="h-4 w-4" />
  }
]

export default function NoteTypeModal({ 
  isOpen, 
  onClose, 
  onSelect, 
  generating 
}: NoteTypeModalProps) {
  const [selectedType, setSelectedType] = useState<string>('general')

  const handleSelect = () => {
    onSelect(selectedType)
  }

  return (
    <Dialog open={isOpen} onOpenChange={generating ? undefined : onClose}>
      <DialogContent className="max-w-sm p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl rounded-xl">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Choose Note Format
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {noteTypes.map((type) => {
            const isSelected = selectedType === type.id
            
            return (
              <button
                key={type.id}
                className={`note-type-option w-full p-3.5 rounded-lg text-left transition-all duration-200 ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 shadow-sm'
                    : 'border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/40'
                }`}
                onClick={() => setSelectedType(type.id)}
                disabled={generating}
              >
                <div className="flex items-center gap-3">
                  <div className={`note-icon-container w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
                    isSelected 
                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' 
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}>
                    {type.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="note-type-title font-medium text-sm text-gray-900 dark:text-gray-100">
                        {type.title}
                      </h3>
                      {isSelected && (
                        <div className="selection-check w-5 h-5 rounded-full bg-blue-600 dark:bg-blue-500 flex items-center justify-center flex-shrink-0">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                    <p className="note-type-description text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {type.description}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex gap-3 pt-5 border-t border-gray-100 dark:border-gray-800 mt-1">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={generating}
            className="flex-1 h-9 text-sm font-medium border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </Button>
          
          <Button 
            onClick={handleSelect}
            disabled={generating}
            className="pro-button flex-1 h-9 text-sm font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
          >
            {generating ? (
              <>
                <Loader2 className="loading-spinner w-4 h-4 mr-2" />
                Creating...
              </>
            ) : (
              'Create Notes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}