'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api, ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function RegisterPage() {
  const router = useRouter()
  const { refresh } = useAuth()
  const toast = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({})

  function validate(): boolean {
    const next: typeof errors = {}
    if (!email.includes('@')) next.email = 'Enter a valid email'
    if (password.length < 8) next.password = 'Password must be at least 8 characters'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setErrors({})
    setLoading(true)

    try {
      await api.post('/auth/register', { email, password })
      await refresh()
      toast('Account created — 7-day Pro trial started!', 'success')
      router.push('/')
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Something went wrong'
      setErrors({ form: message })
      toast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl">
      <h2 className="text-xl font-semibold text-white mb-2">Create your account</h2>
      <p className="text-sm text-zinc-400 mb-6">
        Start with a <span className="text-indigo-400 font-medium">7-day Pro trial</span> — no credit card required to sign up.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          required
          autoComplete="email"
        />
        <Input
          label="Password"
          type="password"
          placeholder="Min. 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          required
          autoComplete="new-password"
        />

        {errors.form && (
          <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
            {errors.form}
          </p>
        )}

        <Button type="submit" loading={loading} className="w-full" size="lg">
          Create account
        </Button>
      </form>

      <div className="mt-6 pt-6 border-t border-zinc-800">
        <ul className="space-y-1.5 text-xs text-zinc-500">
          <li>✓ 7-day Pro trial included</li>
          <li>✓ Unlimited job listings during trial</li>
          <li>✓ Full analytics access</li>
        </ul>
      </div>

      <p className="mt-4 text-center text-sm text-zinc-500">
        Already have an account?{' '}
        <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
          Sign in
        </Link>
      </p>
    </div>
  )
}
