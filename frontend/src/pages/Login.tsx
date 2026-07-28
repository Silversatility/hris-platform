import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import FullScreenLoader from '../components/FullScreenLoader'
import { useAuth } from '../context/AuthContext'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await login(email, password)
      navigate('/')
    } catch {
      setError('Invalid email or password.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f8fafc]">
      {isSubmitting && <FullScreenLoader />}
      <div className="absolute inset-0 [clip-path:polygon(100%_0,100%_100%,0_100%)] bg-gradient-to-br from-[#4f46e5] to-[#4338ca]" />

      <div className="relative z-10 m-6 w-full max-w-sm rounded-3xl bg-[#f9fafb] p-12 text-center shadow-2xl">
        <h1 className="mb-8 text-3xl font-extrabold text-[#111827]">Login</h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="text-left">
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="email address"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-full bg-white px-6 py-4 text-sm text-[#111827] shadow-[0_4px_12px_rgba(0,0,0,0.08)] outline-none ring-1 ring-[#e5e7eb] focus:ring-2 focus:ring-[#4f46e5]"
            />
          </div>
          <div className="text-left">
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full rounded-full bg-white px-6 py-4 text-sm text-[#111827] shadow-[0_4px_12px_rgba(0,0,0,0.08)] outline-none ring-1 ring-[#e5e7eb] focus:ring-2 focus:ring-[#4f46e5]"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-500">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#4338ca] px-12 py-3.5 text-sm font-bold tracking-wide text-[#f8fafc] uppercase shadow-[0_10px_20px_rgba(79,70,229,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
