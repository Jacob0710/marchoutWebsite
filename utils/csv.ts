type CsvValue = string | number | boolean | null | undefined

const escapeCsvValue = (value: CsvValue) => {
  const text = value == null ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export const toCsv = <T extends Record<string, CsvValue>>(rows: T[], columns: Array<keyof T>) => {
  const header = columns.map((column) => escapeCsvValue(String(column))).join(',')
  const body = rows
    .map((row) => columns.map((column) => escapeCsvValue(row[column])).join(','))
    .join('\n')

  return [header, body].filter(Boolean).join('\n')
}
