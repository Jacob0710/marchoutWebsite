import { defineEventHandler } from 'h3'
import { mockFiles } from '~/utils/mockData'

export default defineEventHandler(async (event) => {
  if (getContentDataMode(event) === 'mock') return { items: mockFiles.map((item) => ({
    id: item.id, title: item.title, description: item.description, academicYear: item.academicYear ?? null,
    category: item.category, originalFilename: item.title, mimeType: item.fileType,
    sizeBytes: 0, publishedAt: item.createdAt, downloadUrl: item.fileUrl
  })) }
  const supabase = createSupabaseAnonServerClient(event)
  const response = await supabase.rpc('phase10_public_files')
  const fallback = isPhase10RpcUnavailable(response.error)
    ? await supabase.from('files').select(fileSelect).order('sort_order').order('published_at', { ascending: false }).order('id')
    : response
  throwContentDatabaseError(fallback.error)
  return { items: ((fallback.data ?? []) as unknown as FileRow[]).map(mapPublicFile) }
})
