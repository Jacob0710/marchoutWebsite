interface SeoInput {
  title: string
  description: string
  image?: string
}

export const useSeo = ({ title, description, image }: SeoInput) => {
  const route = useRoute()
  const config = useRuntimeConfig()
  const isPrivateRoute = route.path === '/admin' || route.path.startsWith('/admin/') || route.path.startsWith('/auth/')
  const fullTitle = title.includes('March Out For Love')
    ? title
    : `${title} | March Out For Love`

  useSeoMeta({
    title: fullTitle,
    description,
    ogTitle: fullTitle,
    ogDescription: description,
    ogImage: image,
    twitterCard: 'summary_large_image',
    twitterTitle: fullTitle,
    twitterDescription: description,
    twitterImage: image,
    robots: isPrivateRoute ? 'noindex, nofollow, noarchive' : 'index, follow'
  })

  if (!isPrivateRoute) {
    let canonical: string | undefined
    try {
      const base = String(config.public.siteUrl || '').trim()
      if (base) canonical = new URL(route.path, base.endsWith('/') ? base : `${base}/`).toString()
    } catch { canonical = undefined }
    if (canonical) useHead({ link: [{ rel: 'canonical', href: canonical }] })
  }
}
