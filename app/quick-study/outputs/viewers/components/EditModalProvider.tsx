import React from 'react'
import { useEditModal } from '../hooks/useEditModal'
import { EditModalOverlay } from './EditModalOverlay'

interface EditModalProviderProps {
  children: (openEditModal: (
    content: string,
    elementType: string,
    sourceElement: HTMLElement,
    clickPosition: { x: number; y: number }
  ) => void) => React.ReactNode
}

export function EditModalProvider({ children }: EditModalProviderProps) {
  const {
    editModal,
    openEditModal,
    closeEditModal,
    updateContent,
    saveChanges,
    hasChanges,
    resetContent
  } = useEditModal()

  return (
    <>
      {children(openEditModal)}
      
      {editModal && editModal.isOpen && (
        <EditModalOverlay
          editModal={editModal}
          onClose={closeEditModal}
          onContentChange={updateContent}
          onSave={saveChanges}
          onReset={resetContent}
          hasChanges={hasChanges()}
        />
      )}
    </>
  )
}