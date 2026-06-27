import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await request.formData()
  const file = form.get('file') as File | null
  const name = (form.get('name') as string | null)?.trim()

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!name) return NextResponse.json({ error: 'Resume name is required' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Only PDF and DOCX files are accepted' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File must be under 5 MB' }, { status: 400 })
  }

  const ext = file.type === 'application/pdf' ? 'pdf' : 'docx'
  const fileName = `${Date.now()}_${name.replace(/\s+/g, '_').toLowerCase()}.${ext}`
  const filePath = `${user.id}/${fileName}`

  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from('resumes')
    .upload(filePath, bytes, { contentType: file.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from('resumes').getPublicUrl(filePath)

  const { data: resume, error: dbError } = await supabase
    .from('resumes')
    .insert({
      user_id: user.id,
      name,
      file_path: filePath,
      file_url: urlData.publicUrl,
      mime_type: file.type,
      is_default: false,
    })
    .select()
    .single()

  if (dbError) {
    await supabase.storage.from('resumes').remove([filePath])
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json(resume, { status: 201 })
}
