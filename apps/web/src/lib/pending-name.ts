// The magic-link user record only exists after the email is verified, so the
// name typed at sign-up waits in this browser until the first signed-in visit.
const KEY = 'decar:pending-name'
export const MAX_NAME_LENGTH = 60

export function savePendingName(name: string) {
  try {
    window.localStorage.setItem(KEY, name)
  } catch {
    // storage unavailable — the user can still sign up, just without a name
  }
}

export function takePendingName(): string | null {
  try {
    const name = window.localStorage.getItem(KEY)
    window.localStorage.removeItem(KEY)
    return name
  } catch {
    return null
  }
}
