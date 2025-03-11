import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose'; // Używamy jose zamiast jsonwebtoken

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET_KEY || 'secret_key');

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;

  const publicPages = ['/login', '/register'];
  const isPublicPage = publicPages.includes(request.nextUrl.pathname);

  const isApiRoute = request.nextUrl.pathname.startsWith('/api');

  if (isApiRoute || isPublicPage) {
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL('/login', request.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Weryfikacja tokenu za pomocą jose
    const { payload } = await jwtVerify(token, SECRET_KEY);
    console.log('Token zweryfikowany', payload);
  } catch (error) {
    console.error('Błąd weryfikacji tokenu', error);
    const loginUrl = new URL('/login', request.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/|static/|favicon.ico).*)'],
};