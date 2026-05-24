import { useState } from 'react'
import { User, Building2, Mail, Lock, AlertCircle } from 'lucide-react'

interface EnhancedLoginFormProps {
  onLogin: (email: string, password: string, role: 'tenant' | 'manager') => Promise<void>
  isLoading?: boolean
  className?: string
}

export function EnhancedLoginForm({ onLogin, isLoading = false, className = '' }: EnhancedLoginFormProps) {
  const [role, setRole] = useState<'tenant' | 'manager'>('tenant')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    try {
      await onLogin(email, password, role)
    } catch (err) {
      setError('Login failed. Please check your credentials.')
    }
  }

  return (
    <div className={`glass-panel p-8 rounded-lg w-full max-w-md ${className}`}>
      <div className="text-center mb-8">
        <h2 className="text-ranting-ice text-2xl font-semibold mb-2">Welcome Back</h2>
        <p className="text-ranting-muted text-sm">Sign in to your account</p>
      </div>

      {/* Role Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setRole('tenant')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${
            role === 'tenant'
              ? 'bg-ranting-sky/20 border border-ranting-sky/50 text-ranting-ice'
              : 'bg-ranting-deep/20 border border-transparent text-ranting-muted hover:bg-ranting-deep/30'
          }`}
        >
          <User className="w-4 h-4" />
          Tenant
        </button>
        <button
          onClick={() => setRole('manager')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors ${
            role === 'manager'
              ? 'bg-ranting-sky/20 border border-ranting-sky/50 text-ranting-ice'
              : 'bg-ranting-deep/20 border border-transparent text-ranting-muted hover:bg-ranting-deep/30'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Manager
        </button>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-ranting-muted text-xs mb-2">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ranting-muted" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="aero-input w-full pl-10 pr-4 py-3"
            />
          </div>
        </div>

        <div>
          <label className="block text-ranting-muted text-xs mb-2">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ranting-muted" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="aero-input w-full pl-10 pr-4 py-3"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/20 border border-red-400/50">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="glossy-btn w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      {/* Additional Options */}
      <div className="mt-6 text-center space-y-2">
        <a href="#" className="text-ranting-sky text-sm hover:underline">
          Forgot password?
        </a>
        <p className="text-ranting-muted text-xs">
          Don't have an account?{' '}
          <a href="#" className="text-ranting-sky hover:underline">
            Contact your property manager
          </a>
        </p>
      </div>
    </div>
  )
}
