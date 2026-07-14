interface SeoInput {
  title: string
  description: string
  image?: string
}

export const useSeo = ({ title, description, image }: SeoInput) => {
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
    twitterImage: image
  })
}
