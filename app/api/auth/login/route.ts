import { NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
require('dotenv').config();

const SECRET_KEY = process.env.JWT_SECRET_KEY || 'secret_key';

export async function POST(req: Request) {
  const { email, password } = await req.json();

  try {
    console.log('Próba logowania', { email, password });

    const result = await pool.query('SELECT * FROM "user" WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      console.log('Brak użytkownika o podanym adresie e-mail');
      return NextResponse.json({ message: 'Niepoprawny adres e-mail lub hasło' }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('Niepoprawne hasło');
      return NextResponse.json({ message: 'Niepoprawny adres e-mail lub hasło' }, { status: 401 });
    }

    const token = jwt.sign({ userId: user.id }, SECRET_KEY, { expiresIn: '1h' });
    console.log('Token wygenerowany', token);

    const response = NextResponse.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });

    // Ustawienie tokenu w ciasteczku
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600, // 1 godzina
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Błąd logowania', error);
    return NextResponse.json({ message: 'Błąd serwera' }, { status: 500 });
  }
}