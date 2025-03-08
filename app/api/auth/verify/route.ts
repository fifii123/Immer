import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
require('dotenv').config();

const SECRET_KEY = process.env.JWT_SECRET_KEY || 'secret_key';

// Połączenie z bazą danych
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

export async function GET(req: Request) {
  // Pobierz token z nagłówka Authorization
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return NextResponse.json({ message: 'Brak tokenu' }, { status: 401 });
  }

  try {
    // Weryfikacja tokenu
    const decoded = jwt.verify(token, SECRET_KEY) as { userId: number };

    // Pobierz użytkownika z bazy danych na podstawie userId z tokenu
    const result = await pool.query('SELECT * FROM "user" WHERE id = $1', [decoded.userId]);
    const user = result.rows[0];

    if (!user) {
      return NextResponse.json({ message: 'Użytkownik nie istnieje' }, { status: 404 });
    }

    // Zwróć dane użytkownika (bez hasła)
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Błąd weryfikacji tokenu:', error);

    if (error instanceof jwt.TokenExpiredError) {
      return NextResponse.json({ message: 'Token wygasł' }, { status: 401 });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ message: 'Nieprawidłowy token' }, { status: 401 });
    }

    return NextResponse.json({ message: 'Błąd serwera' }, { status: 500 });
  }
}