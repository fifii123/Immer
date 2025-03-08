import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
require('dotenv').config();

const SECRET_KEY = process.env.JWT_SECRET_KEY || 'secret_key';

// Połączenie z bazą danych

console.log('DB_USER:', process.env.DB_USER); 
console.log('DB_HOST:', process.env.DB_HOST); 
console.log('DB_DATABASE:', process.env.DB_NAME);  
console.log('DB_PASSWORD:', process.env.DB_PASSWORD); 
console.log('JWT_SECRET_KEY:', process.env.JWT_SECRET_KEY);

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

export async function POST(req: Request) {
  const { email, password } = await req.json();

  try {
    console.log('Próba logowania', { email, password });  // Logowanie próby logowania

    const result = await pool.query('SELECT * FROM "user" WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      console.log('Brak użytkownika o podanym adresie e-mail'); // Logowanie braku użytkownika
      return NextResponse.json({ message: 'Niepoprawny adres e-mail lub hasło' }, { status: 401 });
    }

    // Sprawdzenie poprawności hasła
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log('Niepoprawne hasło');  // Logowanie niepoprawnego hasła
      return NextResponse.json({ message: 'Niepoprawny adres e-mail lub hasło' }, { status: 401 });
    }

    // Generowanie tokenu JWT
    const token = jwt.sign({ userId: user.id }, SECRET_KEY, { expiresIn: '1h' });
    console.log('Token wygenerowany', token); // Logowanie wygenerowanego tokenu

    return NextResponse.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (error) {
    console.error('Błąd logowania', error);  // Logowanie błędu
    return NextResponse.json({ message: 'Błąd serwera' }, { status: 500 });
  }
}