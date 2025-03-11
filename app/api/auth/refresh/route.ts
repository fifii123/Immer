import { NextResponse, NextRequest } from 'next/server';
import { jwtVerify, SignJWT } from 'jose'; // Używamy jose zamiast jsonwebtoken

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET_KEY || 'secret_key');
const REFRESH_SECRET_KEY = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET_KEY || 'refresh_secret_key');

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get('refreshToken')?.value;

  if (!refreshToken) {
    return NextResponse.json({ message: 'Brak refresh tokenu' }, { status: 401 });
  }

  try {
    // Weryfikacja refresh tokenu za pomocą jose
    const { payload } = await jwtVerify(refreshToken, REFRESH_SECRET_KEY);
    console.log('Zdekodowany refresh token:', payload);

    // Generowanie nowego access tokenu
    const accessToken = await new SignJWT({ userId: payload.userId })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(SECRET_KEY);

    console.log('Nowy access token:', accessToken);

    const response = NextResponse.json({ accessToken });

    // Ustawienie nowego access tokenu w ciasteczku
    response.cookies.set('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600, // 1 godzina
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Błąd odświeżania tokenu:', error);
    return NextResponse.json({ message: 'Nieprawidłowy refresh token' }, { status: 401 });
  }
}