/** Password policy for new passwords. Returns an error text or null. */
export function passwordProblem(password: string, nick = '') {
  if (password.length < 8) return 'Пароль — минимум 8 символов'
  if (!/[A-Za-zА-Яа-яЁё]/.test(password) || !/\d/.test(password))
    return 'Пароль должен содержать буквы и цифры'
  if (nick && password.toLowerCase().includes(nick.toLowerCase()))
    return 'Пароль не должен содержать ник'
  return null
}
