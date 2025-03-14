import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import AWS from "aws-sdk";

const prisma = new PrismaClient();
const SECRET_KEY = process.env.JWT_SECRET_KEY || "secret_key";

const s3 = new AWS.S3({
  accessKeyId: process.env.B2_KEY_ID!,
  secretAccessKey: process.env.B2_APPLICATION_KEY!,
  endpoint: new AWS.Endpoint('https://s3.us-east-005.backblazeb2.com'),
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
});

const BUCKET_NAME = process.env.B2_BUCKET_NAME!;

export async function GET(request: NextRequest) {
  try {
    // Pobierz fileId z parametrów URL
    const url = new URL(request.url);
    const fileId = url.searchParams.get("fileId");
    const token = url.searchParams.get("token");
    
    if (!fileId || !token) {
      return new Response("Brak wymaganych parametrów", { status: 400 });
    }

    // Weryfikacja tokenu JWT
    let userId;
    try {
      const decoded = jwt.verify(token, SECRET_KEY) as { userId: number };
      userId = decoded.userId;
    } catch (error) {
      return new Response("Nieprawidłowy token", { status: 401 });
    }

    // Pobierz plik z bazy danych
    const file = await prisma.attached_file.findUnique({
      where: { file_id: Number(fileId) },
      include: { project: true }
    });

    if (!file) {
      return new Response("Plik nie istnieje", { status: 404 });
    }

    // Sprawdź, czy użytkownik ma dostęp do pliku
    if (!file.project || file.project.user_id !== userId) {
      return new Response("Brak dostępu do pliku", { status: 403 });
    }

    // Wyciągnij ścieżkę do pliku z URL
    if (!file.file_path) {
      return new Response("Brak ścieżki do pliku", { status: 500 });
    }

    // Parsowanie URL aby wyciągnąć ścieżkę pliku
    try {
      const filePathUrl = new URL(file.file_path);
      // Usuwamy pierwszy znak '/' ze ścieżki
      const key = filePathUrl.pathname.substring(1);

      // Pobierz plik z S3/B2
      const s3Object = await s3.getObject({
        Bucket: BUCKET_NAME,
        Key: key
      }).promise();

      // Utwórz nagłówki odpowiedzi
      const headers = new Headers();
      headers.set("Content-Type", s3Object.ContentType || "application/pdf");
      headers.set("Content-Disposition", `inline; filename="${file.file_name}"`);
      
      // Bardziej permisywne nagłówki bezpieczeństwa
      headers.set("X-Content-Type-Options", "nosniff");
      // Zmodyfikowana polityka CSP - bardziej permisywna dla PDF
      headers.set("Content-Security-Policy", "default-src 'self' 'unsafe-inline' data:; object-src 'self' blob: data:; frame-ancestors 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval';");
      headers.set("X-Frame-Options", "SAMEORIGIN");
      
      // Dodajemy nagłówki CORS
      headers.set("Access-Control-Allow-Origin", "*");
      headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
      headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      
      // Zapobiegaj buforowaniu
      headers.set("Cache-Control", "no-store, max-age=0");
      
      // Zwróć plik jako odpowiedź
      return new Response(s3Object.Body as Buffer, {
        headers: headers
      });
    } catch (error: any) {
      console.error("Błąd pobierania pliku:", error);
      return new Response(`Błąd pobierania pliku: ${error.message}`, { status: 500 });
    }
  } catch (error: any) {
    console.error("Błąd serwera:", error);
    return new Response(`Błąd serwera: ${error.message}`, { status: 500 });
  }
}