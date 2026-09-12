declare module '#auth-utils' {
  interface User {
    id: number
    username: string
    email: string
    role: 'user' | 'admin'
    sessionVersion: number
  }

  interface UserSession {
    loggedInAt: number
  }
}

export {}
