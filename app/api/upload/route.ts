import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const position = formData.get("position") as string

    if (!file || !position) {
      return NextResponse.json({ error: "File and position are required" }, { status: 400 })
    }

    const blob = await put(file.name, file, {
      access: "public",
    })

    // Save to Supabase
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("images")
      .upsert(
        {
          position: Number.parseInt(position),
          image_url: blob.url,
        },
        {
          onConflict: "position",
        },
      )
      .select()
      .single()

    if (error) {
      console.error("Supabase error:", error)
      return NextResponse.json({ error: "Failed to save image to database" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
