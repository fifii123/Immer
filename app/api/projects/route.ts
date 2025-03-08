import { NextResponse } from "next/server";
import { Pool } from "pg";
import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.JWT_SECRET_KEY || "secret_key";

// Konfiguracja połączenia z bazą danych
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

// Endpoint GET do pobierania projektów
export async function GET(request: Request) {
  try {
    // Pobierz token z nagłówka Authorization
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Brak tokenu autoryzacyjnego" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    // Weryfikacja tokenu JWT
    const decoded = jwt.verify(token, SECRET_KEY) as { userId: number };
    const userId = decoded.userId;

    // Pobierz projekty z bazy danych dla danego użytkownika
    const result = await pool.query('SELECT * FROM project WHERE user_id = $1', [userId]);
    const projects = result.rows;

    return NextResponse.json(projects, { status: 200 });
  } catch (error) {
    console.error("Błąd podczas pobierania projektów:", error);
    return NextResponse.json({ message: "Błąd serwera" }, { status: 500 });
  }
}