export function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  return 'Что-то пошло не так. Попробуйте ещё раз.'
}
