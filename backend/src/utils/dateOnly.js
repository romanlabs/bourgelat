const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/

const isDateOnly = (value) => typeof value === 'string' && DATE_ONLY_REGEX.test(value)

const formatDateOnlyLocal = (date = new Date()) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const isValidDateOnly = (value) => {
  if (!isDateOnly(value)) return false

  const [year, month, day] = value.split('-').map(Number)
  const parsed = new Date(year, month - 1, day)

  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  )
}

const isPastDateOnly = (value, today = formatDateOnlyLocal()) =>
  isValidDateOnly(value) && value < today

module.exports = {
  DATE_ONLY_REGEX,
  formatDateOnlyLocal,
  isDateOnly,
  isValidDateOnly,
  isPastDateOnly,
}
