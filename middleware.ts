import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/|static/|favicon.ico).*)'], 
};