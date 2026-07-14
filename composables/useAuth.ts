interface LoginCredentials {
  email: string
  password: string
}

export const useAuth = () => {
  const authCookie = useCookie<boolean>('mock-admin-auth', {
    default: () => false,
    sameSite: 'lax'
  })
  const isLoggedIn = useState('mock-admin-auth', () => authCookie.value === true)
  const authError = useState<string>('admin-auth-error', () => '')
  const { isSupabaseConfigured } = useSupabaseConfig()

  const syncLoggedIn = (value: boolean) => {
    isLoggedIn.value = value
    authCookie.value = value
  }

  const refreshSession = async () => {
    if (!isSupabaseConfigured) {
      return isLoggedIn.value
    }

    const supabase = useSupabaseClient()
    if (!supabase) return false

    const { data, error } = await supabase.auth.getSession()
    if (error) {
      authError.value = error.message
      syncLoggedIn(false)
      return false
    }

    const hasSession = Boolean(data.session)
    syncLoggedIn(hasSession)
    return hasSession
  }

  const login = async (redirectTo = '/admin/dashboard', credentials?: LoginCredentials) => {
    authError.value = ''

    if (isSupabaseConfigured) {
      const supabase = useSupabaseClient()
      if (!supabase) {
        throw new Error('Supabase is not configured.')
      }

      if (!credentials?.email || !credentials.password) {
        authError.value = 'Email and password are required.'
        throw new Error(authError.value)
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      })

      if (error) {
        authError.value = error.message
        syncLoggedIn(false)
        throw new Error(error.message)
      }
    }

    syncLoggedIn(true)
    await navigateTo(redirectTo)
  }

  const logout = async () => {
    authError.value = ''

    if (isSupabaseConfigured) {
      const supabase = useSupabaseClient()
      if (supabase) {
        const { error } = await supabase.auth.signOut()
        if (error) {
          authError.value = error.message
        }
      }
    }

    syncLoggedIn(false)
    await navigateTo('/admin/login')
  }

  return {
    isLoggedIn,
    authError,
    isSupabaseConfigured,
    refreshSession,
    login,
    logout
  }
}
