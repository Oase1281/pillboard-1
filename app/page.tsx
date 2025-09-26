"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { ImageSlot } from "@/components/image-slot"
import { ImageModal } from "@/components/image-modal" // Added import for image modal
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
// import { Save } from 'lucide-react'

interface ImageData {
  id: number
  position: number
  image_url: string
  uploaded_at: string
}

interface FallingPill {
  id: number
  left: number
  animationDelay: number
}

export default function LiveImageBoard() {
  const [images, setImages] = useState<Record<number, ImageData>>({})
  const [title, setTitle] = useState("PillBoard") // Changed title from "Live Image Board" to "PillBoard"
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [tempTitle, setTempTitle] = useState(title)
  const [modalImage, setModalImage] = useState<{ url: string; position: number } | null>(null)
  const [backgroundImage, setBackgroundImage] = useState<string | null>("/pump-fun-background.jpeg")
  const [fallingPills, setFallingPills] = useState<FallingPill[]>([])
  const [latestUploadedPosition, setLatestUploadedPosition] = useState<number | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Fetch initial images
    fetchImages()
    fetchBackgroundImage()

    // Subscribe to real-time changes
    const channel = supabase
      .channel("images-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "images",
        },
        (payload) => {
          console.log("[v0] Real-time update received:", payload)
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const newImage = payload.new as ImageData
            if (newImage.position === -1) {
              setBackgroundImage(newImage.image_url)
            } else {
              setImages((prev) => ({
                ...prev,
                [newImage.position]: newImage,
              }))
              if (payload.eventType === "INSERT") {
                setLatestUploadedPosition(newImage.position)
                setTimeout(() => {
                  setLatestUploadedPosition(null)
                }, 3000)
              }
            }
          } else if (payload.eventType === "DELETE") {
            const deletedImage = payload.old as ImageData
            if (deletedImage.position === -1) {
              setBackgroundImage(null)
            } else {
              setImages((prev) => {
                const updated = { ...prev }
                delete updated[deletedImage.position]
                return updated
              })
            }
          }
        },
      )
      .subscribe()

    let pillId = 0

    const spawnPill = () => {
      const newPill: FallingPill = {
        id: pillId++,
        left: Math.random() * 100, // Random horizontal position (0-100%)
        animationDelay: 0,
      }

      setFallingPills((prev) => [...prev, newPill])

      // Remove pill after animation completes (fall + stay + fade = ~12 seconds)
      setTimeout(() => {
        setFallingPills((prev) => prev.filter((pill) => pill.id !== newPill.id))
      }, 12000)
    }

    // Spawn first pill immediately
    spawnPill()

    const interval = setInterval(spawnPill, 500)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [])

  const fetchBackgroundImage = async () => {
    try {
      const { data, error } = await supabase
        .from("images")
        .select("*")
        .eq("position", -1) // Use position -1 for background image
        .single()

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "not found" error
        console.error("[v0] Error fetching background image:", error)
        return
      }

      if (data) {
        setBackgroundImage(data.image_url)
      }
    } catch (error) {
      console.error("[v0] Unexpected error fetching background image:", error)
    }
  }

  const fetchImages = async () => {
    try {
      console.log("[v0] Fetching images from database...")

      const { data, error } = await supabase.from("images").select("*").gte("position", 0).order("position")

      if (error) {
        console.error("[v0] Error fetching images:", error)
        // Try to handle schema cache issues by retrying once
        if (error.message.includes("schema cache")) {
          console.log("[v0] Schema cache issue detected, retrying...")
          await new Promise((resolve) => setTimeout(resolve, 1000))
          const { data: retryData, error: retryError } = await supabase
            .from("images")
            .select("*")
            .gte("position", 0)
            .order("position")

          if (retryError) {
            console.error("[v0] Retry failed:", retryError)
            return
          }

          const imageMap: Record<number, ImageData> = {}
          retryData?.forEach((image) => {
            imageMap[image.position] = image
          })
          setImages(imageMap)
          console.log("[v0] Images fetched successfully after retry:", retryData?.length || 0)
          return
        }
        return
      }

      const imageMap: Record<number, ImageData> = {}
      data?.forEach((image) => {
        imageMap[image.position] = image
      })
      setImages(imageMap)
      console.log("[v0] Images fetched successfully:", data?.length || 0)
    } catch (error) {
      console.error("[v0] Unexpected error fetching images:", error)
    }
  }

  const handleBackgroundUpload = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("position", "-1") // Use position -1 for background

    try {
      console.log("[v0] Starting background upload...")
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        let errorMessage = "Background upload failed"
        const contentType = response.headers.get("content-type")

        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
            console.error("[v0] Background upload failed:", errorData)
          } catch (parseError) {
            console.error("[v0] Failed to parse error response:", parseError)
          }
        } else {
          const errorText = await response.text()
          console.error("[v0] Background upload failed with non-JSON response:", errorText)
          errorMessage = errorText || errorMessage
        }

        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log("[v0] Background image uploaded successfully:", result)

      if (result.data && result.data.image_url) {
        setBackgroundImage(result.data.image_url)
      }
    } catch (error) {
      console.error("[v0] Background upload error:", error)
    }
  }

  const handleImageUpload = async (position: number, file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("position", position.toString())

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        let errorMessage = "Upload failed"
        const contentType = response.headers.get("content-type")

        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
          } catch (parseError) {
            console.error("[v0] Failed to parse error response:", parseError)
          }
        } else {
          const errorText = await response.text()
          console.error("[v0] Upload failed with non-JSON response:", errorText)
          errorMessage = errorText || errorMessage
        }

        throw new Error(errorMessage)
      }

      console.log("[v0] Image uploaded successfully")
    } catch (error) {
      console.error("Upload error:", error)
    }
  }

  const handleImageRemove = async (position: number) => {
    try {
      const { error } = await supabase.from("images").delete().eq("position", position)

      if (error) {
        console.error("Error removing image:", error)
      }
    } catch (error) {
      console.error("Remove error:", error)
    }
  }

  const handleImageClick = (imageUrl: string, position: number) => {
    setModalImage({ url: imageUrl, position })
  }

  const handleCloseModal = () => {
    setModalImage(null)
  }

  const handleTitleSave = () => {
    setTitle(tempTitle)
    setIsEditingTitle(false)
  }

  const handleTitleCancel = () => {
    setTempTitle(title)
    setIsEditingTitle(false)
  }

  return (
    <div
      className="min-h-screen p-4 relative overflow-hidden"
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundColor: backgroundImage ? "transparent" : "hsl(var(--background))",
      }}
    >
      {backgroundImage && <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]" />}

      {/* Border pills moving counter-clockwise around the grid */}
      <div className="absolute inset-0 pointer-events-none z-5">
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={`border-pill-${index}`}
            className="absolute w-6 h-6 animate-border-pill-orbit"
            style={{
              animationDelay: `${index * 2}s`,
            }}
          >
            <img src="/pill-icon.png" alt="Border pill" className="w-full h-full object-contain opacity-70" />
          </div>
        ))}
      </div>

      <div className="absolute inset-0 pointer-events-none z-5">
        {fallingPills.map((pill) => (
          <div
            key={pill.id}
            className="absolute w-8 h-8 animate-pill-fall"
            style={{
              left: `${pill.left}%`,
              top: "-32px",
              animationDelay: `${pill.animationDelay}s`,
            }}
          >
            <img src="/pill-icon.png" alt="Falling pill" className="w-full h-full object-contain opacity-80" />
          </div>
        ))}
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="fixed top-4 right-4 z-20">
          <input
            id="background-upload"
            type="file"
            accept="image/*,image/gif,.gif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                console.log("[v0] Background file selected:", file.name)
                handleBackgroundUpload(file)
              }
            }}
          />
        </div>

        {/* Header with editable title */}
        <div className="text-center mb-8">
          {isEditingTitle ? (
            <div className="flex items-center justify-center gap-2 mb-4">
              <Input
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                className="text-2xl font-bold text-center max-w-md bg-background/80 backdrop-blur-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSave()
                  if (e.key === "Escape") handleTitleCancel()
                }}
                autoFocus
              />
              <Button size="sm" onClick={handleTitleSave}>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 mb-4 bg-background/20 backdrop-blur-sm rounded-xl px-6 py-3 shadow-lg">
              <h1 className="font-bold text-foreground drop-shadow-lg text-8xl">{title}</h1>
              <img
                src="/pill-edit-icon.png"
                alt="Edit title"
                onClick={() => setIsEditingTitle(true)}
                className="w-8 h-8 cursor-pointer hover:scale-110 transition-transform duration-200 drop-shadow-lg"
              />
            </div>
          )}
          <p className="text-muted-foreground drop-shadow-md bg-background/60 backdrop-blur-sm rounded-lg px-4 py-2 inline-block">
            Click on any empty slot to upload an image. Click on images to view them larger. Changes appear live 24/7!
          </p>
        </div>

        <div className="grid grid-cols-10 gap-2 max-w-4xl mx-auto">
          {Array.from({ length: 100 }, (_, index) => (
            <ImageSlot
              key={index}
              position={index}
              imageUrl={images[index]?.image_url}
              onImageUpload={handleImageUpload}
              onImageRemove={handleImageRemove}
              onImageClick={handleImageClick}
              className="aspect-square" // All boxes are now square and same size
              isLatestUpload={latestUploadedPosition === index}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p className="drop-shadow-md bg-background/60 backdrop-blur-sm rounded-lg px-4 py-2 inline-block text-lg">
            CA:
          </p>
        </div>
      </div>

      {modalImage && (
        <ImageModal
          imageUrl={modalImage.url}
          position={modalImage.position}
          isOpen={!!modalImage}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}
