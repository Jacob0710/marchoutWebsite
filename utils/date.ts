export const formatDate = (value: string) =>
  new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(value))

export const toMinguoDate = (value: string) => {
  const date = new Date(value)
  return `${date.getFullYear() - 1911}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}
