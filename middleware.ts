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
    // Dodajemy parametr przekierowania
    loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Weryfikacja tokenu za pomocą jose
    await jwtVerify(token, SECRET_KEY);
    // Jeśli weryfikacja się powiedzie, pozwól użytkownikowi przejść dalej
    return NextResponse.next();
  } catch (error) {
    // Jeśli token jest nieważny, usuń go z ciasteczek
    const loginUrl = new URL('/login', request.nextUrl.origin);
    // Dodajemy parametr przekierowania
    loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    
    // KLUCZOWA ZMIANA: Usuwamy nieważny token przy przekierowaniu
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('token');
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/|static/|favicon.ico).*)'],
};