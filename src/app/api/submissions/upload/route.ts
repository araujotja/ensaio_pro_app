import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const ALLOWED_AUDIO = new Set([
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
  'audio/aac',
])

const ALLOWED_VIDEO = new Set([
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
])

const MAX_AUDIO_BYTES = 25 * 1024 * 1024
const MAX_VIDEO_BYTES = 100 * 1024 * 1024

const uuidSchema = z.uuid()

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '_')
    .replace(/^[./]+/, '')
    .slice(0, 128)
}

// Validate file magic bytes to prevent MIME-type spoofing.
// Checks the most common audio/video container signatures.
function hasValidMagicBytes(buffer: ArrayBuffer): boolean {
  const b = new Uint8Array(buffer.slice(0, 16))

  // ID3 tag → MP3
  if (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) return true
  // MPEG audio frame sync (MP3 without ID3)
  if (b[0] === 0xFF && (b[1] & 0xE2) === 0xE2) return true
  // OggS → OGG audio / OGG video
  if (b[0] === 0x4F && b[1] === 0x67 && b[2] === 0x67 && b[3] === 0x53) return true
  // RIFF → WAV
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46) return true
  // WebM (EBML)
  if (b[0] === 0x1A && b[1] === 0x45 && b[2] === 0xDF && b[3] === 0xA3) return true
  // ISO Base Media (MP4 / M4A / MOV): 'ftyp' box at offset 4
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) return true
  // AAC ADTS (raw AAC)
  if (b[0] === 0xFF && (b[1] === 0xF1 || b[1] === 0xF9)) return true

  return false
}

const UPLOAD_RATE_LIMIT = 20
const UPLOAD_WINDOW_MS  = 60 * 60 * 1000 // 1 hour

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // DB-based rate limit on uploads — prevents Storage exhaustion
  const windowStart = new Date(Date.now() - UPLOAD_WINDOW_MS).toISOString()
  const { count: recentUploads } = await supabase
    .from('submission')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .in('type', ['audio', 'video'])
    .gte('created_at', windowStart)

  if ((recentUploads ?? 0) >= UPLOAD_RATE_LIMIT) {
    return NextResponse.json(
      { error: `Limite de ${UPLOAD_RATE_LIMIT} uploads por hora atingido. Tente novamente mais tarde.` },
      { status: 429 },
    )
  }

  const formData = await request.formData().catch(() => null)
  if (!formData) {
    return NextResponse.json({ error: 'Form data inválido' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const taskId = formData.get('task_id') as string | null
  const type = formData.get('type') as string | null

  if (!file || !taskId || !type) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
  }

  if (!uuidSchema.safeParse(taskId).success) {
    return NextResponse.json({ error: 'task_id inválido' }, { status: 400 })
  }

  const isAudio = type === 'audio'
  const isVideo = type === 'video'

  if (!isAudio && !isVideo) {
    return NextResponse.json({ error: 'Tipo deve ser audio ou video' }, { status: 400 })
  }

  if (isAudio && !ALLOWED_AUDIO.has(file.type)) {
    return NextResponse.json({ error: 'Tipo de arquivo de áudio inválido' }, { status: 400 })
  }

  if (isVideo && !ALLOWED_VIDEO.has(file.type)) {
    return NextResponse.json({ error: 'Tipo de arquivo de vídeo inválido' }, { status: 400 })
  }

  const maxBytes = isAudio ? MAX_AUDIO_BYTES : MAX_VIDEO_BYTES
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: `Arquivo muito grande. Máximo: ${maxBytes / 1024 / 1024}MB` },
      { status: 413 },
    )
  }

  // Read buffer once; used for both magic-byte validation and upload
  const arrayBuffer = await file.arrayBuffer()

  if (!hasValidMagicBytes(arrayBuffer)) {
    return NextResponse.json(
      { error: 'O conteúdo do arquivo não corresponde ao tipo declarado' },
      { status: 400 },
    )
  }

  const { data: task, error: taskErr } = await supabase
    .from('task')
    .select('id, group_id')
    .eq('id', taskId)
    .single()

  if (taskErr || !task) {
    return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })
  }

  const { data: membership } = await supabase
    .from('membership')
    .select('id')
    .eq('group_id', task.group_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) {
    return NextResponse.json({ error: 'Sem permissão para esta tarefa' }, { status: 403 })
  }

  const ext = sanitizeFilename(file.name).split('.').pop() ?? 'bin'
  const storagePath = `${user.id}/${taskId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('task-submissions')
    .upload(storagePath, arrayBuffer, { contentType: file.type })

  if (uploadError) {
    return NextResponse.json({ error: 'Erro ao fazer upload' }, { status: 500 })
  }

  const { data: submission, error: subError } = await supabase
    .from('submission')
    .insert({
      task_id: taskId,
      user_id: user.id,
      type,
      storage_path: storagePath,
    })
    .select()
    .single()

  if (subError) {
    await supabase.storage.from('task-submissions').remove([storagePath])
    return NextResponse.json({ error: 'Erro ao salvar envio' }, { status: 500 })
  }

  const service = createServiceClient()
  await service.from('task').update({ status: 'enviado' }).eq('id', taskId)
  await service.from('audit_log').insert({
    user_id: user.id,
    action: 'submission_upload',
    resource_type: 'submission',
    resource_id: submission.id,
    metadata: { task_id: taskId, type, size: file.size },
  })

  return NextResponse.json({ ok: true, submissionId: submission.id })
}
