import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ message: 'Wylogowano pomyślnie' });

  // Usuń ciasteczko z tokenem
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(0), // Ustaw datę wygaśnięcia na przeszłość, aby usunąć ciasteczko
    path: '/',
  });

  return response;
}