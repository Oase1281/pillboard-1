"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ImageSlotProps {
  position: number
  imageUrl?: string
  onImageUpload: (position: number, file: File) => void
  onImageRemove: (position: number) => void
  onImageClick: (imageUrl: string, position: number) => void // Added callback for image click
  className?: string // Added className prop for size variations
}

export function ImageSlot({
  position,
  imageUrl,
  onImageUpload,
  onImageRemove,
  onImageClick,
  className,
}: ImageSlotProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      await onImageUpload(position, file)
    } finally {
      setIsUploading(false)
    }
  }

  const handleClick = () => {
    if (imageUrl) {
      onImageClick(imageUrl, position)
    } else if (!isUploading) {
      fileInputRef.current?.click()
    }
  }

  return (
    <div
      className={`relative bg-card border border-border overflow-hidden cursor-pointer hover:border-accent transition-colors group ${className || "aspect-square"}`} // Use dynamic className instead of fixed aspect-square
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,image/gif,.gif"
        onChange={handleFileSelect}
        className="hidden"
      />

      {imageUrl ? (
        <>
          <img
            src={imageUrl || "/placeholder.svg"}
            alt={`Image at position ${position}`}
            className="w-full h-full object-cover"
          />
          <Button
            size="sm"
            variant="destructive"
            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              onImageRemove(position)
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </>
      ) : (
        <div className="flex items-center justify-center h-full relative overflow-hidden">
          {/* Generate a unique pattern based on position */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background: `linear-gradient(${(position * 37) % 360}deg, 
                hsl(${(position * 47) % 360}, 60%, 85%), 
                hsl(${(position * 73) % 360}, 60%, 90%))`,
            }}
          />
          <div className="relative z-10 text-center">
            {isUploading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent mx-auto"></div>
            ) : (
              <>
                <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground/60" />
                <div className="text-xs text-muted-foreground/40 font-medium">{position}</div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
