// app/api/files/proxy-pdf/route.ts
import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';

/**
 * Endpoint proxy dla plików PDF z Backblaze B2
 * Omija problemy z CORS pobierając plik po stronie serwera
 */
export async function GET(request: Request) {
  try {
    // Parsuj parametry URL
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');
    const download = searchParams.get('download') === 'true';
    const filename = searchParams.get('filename') || 'document.pdf';

    // Sprawdź wymagane parametry
    if (!fileId) {
      return NextResponse.json({ error: 'Missing fileId parameter' }, { status: 400 });
    }

    // Pobierz token z nagłówka Authorization (zakładając, że klient go wysyła)
    const headersList = await headers();
    const authorization = headersList.get('Authorization');
    const cookiesList = await cookies();
    const token = authorization?.replace('Bearer ', '') || cookiesList.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Pobierz podpisany URL dla pliku
    const signedUrl = await getSignedUrlForFile(fileId, token);
    
    if (!signedUrl) {
      return NextResponse.json({ error: 'Failed to get signed URL for file' }, { status: 404 });
    }

    // Pobierz plik z Backblaze B2
    const fileResponse = await fetch(signedUrl, {
      // Dodajemy timeout aby zapobiec zablokowaniu serwera
      signal: AbortSignal.timeout(30000), // 30 sekund
    });

    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.status} ${fileResponse.statusText}`);
    }

    // Pobierz nagłówki
    const contentType = fileResponse.headers.get('content-type') || 'application/pdf';
    const contentLength = fileResponse.headers.get('content-length');
    const contentDisposition = download 
      ? `attachment; filename="${encodeURIComponent(filename)}"` 
      : 'inline';

    // Pobierz dane jako ArrayBuffer
    const arrayBuffer = await fileResponse.arrayBuffer();

    // Stwórz nagłówki odpowiedzi
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', contentType);
    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }
    responseHeaders.set('Content-Disposition', contentDisposition);
    responseHeaders.set('Cache-Control', 'public, max-age=300'); // Cache na 5 minut

    // Zwróć odpowiedź
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Error proxying PDF file:', error);
    return NextResponse.json(
      { error: 'Failed to proxy PDF file' }, 
      { status: 500 }
    );
  }
}

/**
 * Funkcja pobierająca podpisany URL z API
 * Wykorzystuje istniejącą logikę z endpointu getSignedUrl
 * 
 * Uwaga: Ta funkcja jest używana na serwerze, więc relatywne URLe nie zadziałają
 * Musimy użyć pełnego URL z odpowiednim hostem
 */
async function getSignedUrlForFile(fileId: string, token: string): Promise<string | null> {
  try {
    // W środowisku serwera musimy użyć pełnego URL
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.VERCEL_URL || 'http://localhost:3000';
    const apiUrl = `${baseUrl}/api/files/getSignedUrl?fileId=${fileId}`;
    
    console.log(`Fetching signed URL from: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to get signed URL: ${response.status}`);
    }

    const data = await response.json();
    return data.signedUrl;
  } catch (error) {
    console.error('Error getting signed URL:', error);
    return null;
  }
}

export const dynamic = 'force-dynamic'; // Wymuszamy dynamiczne renderowanie