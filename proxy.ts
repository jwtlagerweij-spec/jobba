import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Public paths — always accessible
  const publicPaths = ['/', '/login', '/signup', '/jobs', '/email/unsubscribe', '/privacy', '/terms']
  const isPublic = publicPaths.some(p => pathname === p || pathname.startsWith('/jobs/') && !pathname.startsWith('/jobs/['))

  if (!user && !isPublic && !pathname.startsWith('/api/')) {
    // Save where the user wanted to go so we can redirect after login
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('returnUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (user) {
    // Redirect logged-in users away from auth pages
    if (pathname === '/login' || pathname === '/signup') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_done')
        .eq('id', user.id)
        .single()

      const returnUrl = request.nextUrl.searchParams.get('returnUrl')
      const dest = returnUrl || (profile?.onboarding_done ? '/dashboard' : '/onboarding/upload')
      return NextResponse.redirect(new URL(dest, request.url))
    }

    // Redirect to onboarding if not done yet
    if (!pathname.startsWith('/onboarding') && !pathname.startsWith('/api/')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_done')
        .eq('id', user.id)
        .single()

      if (profile && !profile.onboarding_done) {
        return NextResponse.redirect(new URL('/onboarding/upload', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
