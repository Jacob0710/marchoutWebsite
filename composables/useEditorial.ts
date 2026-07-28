import type { EditorialQueueResponse, EditorialReviewDetail, EditorialReviewUpdateInput } from '~/types/editorial'

export const useEditorialQueue = (filters: {
  state: Ref<string>
  severity: Ref<string>
  targetKind: Ref<string>
  q: Ref<string>
  offset: Ref<number>
}) => {
  const requestHeaders = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  const query = computed(() => ({
    state: filters.state.value,
    severity: filters.severity.value,
    targetKind: filters.targetKind.value,
    q: filters.q.value || undefined,
    limit: 50,
    offset: filters.offset.value
  }))
  return useAsyncData(
    'phase10-editorial-queue',
    () => $fetch<EditorialQueueResponse>('/api/admin/editorial', { headers: requestHeaders, query: query.value }),
    { watch: [query] }
  )
}

export const useEditorialReview = (reviewKey: Ref<string>) => {
  const requestHeaders = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  return useAsyncData(
    `phase10-editorial-${reviewKey.value}`,
    () => $fetch<{ item: EditorialReviewDetail }>(`/api/admin/editorial/${encodeURIComponent(reviewKey.value)}`, { headers: requestHeaders }),
    { watch: [reviewKey] }
  )
}

export const useEditorialMutations = () => ({
  updateReview: (reviewKey: string, input: EditorialReviewUpdateInput) =>
    $fetch<{ item: EditorialReviewDetail }>(`/api/admin/editorial/${encodeURIComponent(reviewKey)}`, { method: 'PATCH', body: input }),
  uploadDerivative: (reviewKey: string, assetId: string, file: File) => {
    const body = new FormData()
    body.append('assetId', assetId)
    body.append('file', file)
    return $fetch(`/api/admin/editorial/${encodeURIComponent(reviewKey)}/derivatives`, { method: 'POST', body })
  },
  verifyRedirect: (redirectKey: string, verifiedOrigin: string, targetVersion: string) =>
    $fetch(`/api/admin/editorial/redirects/${encodeURIComponent(redirectKey)}/verify`, {
      method: 'POST', body: { verifiedOrigin, targetVersion }
    })
})
