import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

import { prisma } from "../../../../lib/prisma"
const SECRET_KEY = process.env.JWT_SECRET_KEY || "secret_key";

export async function GET(request: Request) {
  try {
    // Pobierz token z nagłówka Authorization
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Brak tokenu autoryzacyjnego" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, SECRET_KEY) as { userId: number };
    const userId = decoded.userId;

    // Pobierz projekty wraz z powiązanymi plikami
    const projects = await prisma.project.findMany({
      where: { user_id: userId },
      include: {
        attached_file: true, // Pobranie powiązanych plików
      },
    });

    return NextResponse.json(projects, { status: 200 });
  } catch (error) {
    console.error("Błąd podczas pobierania projektów:", error);
    return NextResponse.json({ message: "Błąd serwera" }, { status: 500 });
  }
}
