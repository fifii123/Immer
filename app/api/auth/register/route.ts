import { NextResponse } from "next/server";
import pool from '../../../../lib/db'
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
require("dotenv").config();

const SECRET_KEY = process.env.JWT_SECRET_KEY || "secret_key";



export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    console.log("Rejestracja użytkownika:", { name, email });

    // Walidacja danych
    if (!name || !email || !password) {
      return NextResponse.json({ message: "Wszystkie pola są wymagane" }, { status: 400 });
    }

    // Sprawdzenie, czy użytkownik już istnieje
    const existingUser = await pool.query('SELECT * FROM "user" WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return NextResponse.json({ message: "Adres e-mail jest już zajęty" }, { status: 400 });
    }

    // Hashowanie hasła
    const hashedPassword = await bcrypt.hash(password, 10);

    // Dodanie użytkownika do bazy danych
    const result = await pool.query(
      'INSERT INTO "user" (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hashedPassword]
    );

    const newUser = result.rows[0];

    // Generowanie tokenu JWT
    const token = jwt.sign({ userId: newUser.id }, SECRET_KEY, { expiresIn: "1h" });

    console.log("Nowy użytkownik zarejestrowany:", newUser);

    return NextResponse.json({
      token,
      user: { id: newUser.id, email: newUser.email, name: newUser.name },
    });
  } catch (error) {
    console.error("Błąd rejestracji:", error);
    return NextResponse.json({ message: "Błąd serwera" }, { status: 500 });
  }
}
