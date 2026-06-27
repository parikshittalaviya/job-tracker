import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest, ctx: RouteContext<'/api/applications/[id]/notes'>) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content } = await request.json() as { content: string }
  if (!content?.trim()) return NextResponse.json({ error: 'content is required' }, { status: 400 })

  // Verify the application belongs to this user
  const { data: app } = await supabase
    .from('job_applications')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('application_notes')
    .insert({ application_id: id, user_id: user.id, content: content.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(request: NextRequest, ctx: RouteContext<'/api/applications/[id]/notes'>) {
  const { id: applicationId } = await ctx.params
  const { searchParams } = new URL(request.url)
  const noteId = searchParams.get('noteId')
  if (!noteId) return NextResponse.json({ error: 'noteId is required' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('application_notes')
    .delete()
    .eq('id', noteId)
    .eq('application_id', applicationId)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
