'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { verifyPassword, signSession, setSessionCookie } from '@/lib/auth'

export type LoginState = { error?: string }

export async function loginAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const redirectTo = String(formData.get('from') ?? '/admin')

  if (!email || !password) {
    return { error: 'Email e senha são obrigatórios' }
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return { error: 'Credenciais inválidas' }
  }

  const ok = await verifyPassword(password, user.password)
  if (!ok) {
    return { error: 'Credenciais inválidas' }
  }

  if (user.role !== 'ADMIN') {
    return { error: 'Acesso restrito a administradores' }
  }

  const token = await signSession({
    userId: user.id,
    email: user.email,
    role: 'ADMIN',
    name: user.name,
  })

  await setSessionCookie(token)
  redirect(redirectTo.startsWith('/admin') ? redirectTo : '/admin')
}
