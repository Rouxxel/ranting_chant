import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  name: string
  email: string
  role: 'tenant' | 'manager' | 'admin'
  unit?: string
  propertyId?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string, role: 'tenant' | 'manager') => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // TODO: Check for existing token/session on mount
    // Wire to backend authentication endpoint
    const checkAuth = async () => {
      try {
        // const token = localStorage.getItem('auth_token')
        // if (token) {
        //   const response = await fetch('/api/auth/verify', {
        //     headers: { Authorization: `Bearer ${token}` }
        //   })
        //   if (response.ok) {
        //     const userData = await response.json()
        //     setUser(userData)
        //   }
        // }
      } catch (error) {
        console.error('Auth check failed:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string, role: 'tenant' | 'manager') => {
    // TODO: Wire to backend login endpoint
    // POST /api/auth/login
    try {
      // const response = await fetch('/api/auth/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email, password, role })
      // })
      // if (!response.ok) throw new Error('Login failed')
      // const { user: userData, token } = await response.json()
      // localStorage.setItem('auth_token', token)
      // setUser(userData)

      // Mock login for shell
      setUser({
        id: 'user_001',
        name: 'John Doe',
        email,
        role,
        unit: role === 'tenant' ? '4B' : undefined,
        propertyId: 'property_001'
      })
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    // TODO: Wire to backend logout endpoint
    // POST /api/auth/logout
    try {
      // await fetch('/api/auth/logout', {
      //   method: 'POST',
      //   headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      // })
      localStorage.removeItem('auth_token')
      setUser(null)
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const refreshToken = async () => {
    // TODO: Wire to backend refresh token endpoint
    // POST /api/auth/refresh
    try {
      // const response = await fetch('/api/auth/refresh', {
      //   method: 'POST',
      //   headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      // })
      // if (!response.ok) throw new Error('Token refresh failed')
      // const { token } = await response.json()
      // localStorage.setItem('auth_token', token)
    } catch (error) {
      console.error('Token refresh failed:', error)
      await logout()
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshToken
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
