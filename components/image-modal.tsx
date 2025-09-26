"use client"

import type React from "react"

// import { X } from 'lucide-react'
import { Button } from "@/components/ui/button"

interface ImageModalProps {
  imageUrl: string
  position: number
  isOpen: boolean
  onClose: () => void
}

export function ImageModal({ imageUrl, position, isOpen, onClose }: ImageModalProps) {
  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/50"
      onClick={handleBackdropClick}
    >
      <div className="relative max-w-4xl max-h-[90vh] w-full">
        <Button
          size="sm"
          variant="secondary"
          className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background"
          onClick={onClose}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Button>
        <img
          src={imageUrl || "/placeholder.svg"}
          alt={`Image at position ${position}`}
          className="w-full h-full object-contain rounded-lg shadow-2xl"
        />
      </div>
    </div>
  )
}
