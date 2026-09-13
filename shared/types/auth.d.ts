declare module '#auth-utils' {
  interface User {
    id: number
    username: string
    avatarUrl: string | null
    email: string
    role: 'user' | 'admin'
    sessionVersion: number
  }

  interface UserSession {
    loggedInAt: number
  }
}

export {}
