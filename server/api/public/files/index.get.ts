import { defineEventHandler } from 'h3'
import { mockFiles } from '~/utils/mockData'

export default defineEventHandler(async (event) => {
  if (getContentDataMode(event) === 'mock') return { items: mockFiles.map((item) => ({
    id: item.id, title: item.title, description: item.description, academicYear: item.academicYear ?? null,
    category: item.category, originalFilename: item.title, mimeType: item.fileType,
    sizeBytes: 0, publishedAt: item.createdAt, downloadUrl: item.fileUrl
  })) }
  const supabase = createSupabaseAnonServerClient(event)
  const { data, error } = await supabase.from('files').select(fileSelect).order('sort_order').order('published_at', { ascending: false }).order('id')
  throwContentDatabaseError(error)
  return { items: ((data ?? []) as unknown as FileRow[]).map(mapPublicFile) }
})
