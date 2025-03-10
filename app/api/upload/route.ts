import BackblazeB2 from 'backblaze-b2';
import { NextResponse } from 'next/server';

interface B2Bucket {
  bucketId: string;
  bucketName: string;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Brak pliku' }, { status: 400 });
    }

    const fileName = file.name;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Autoryzacja w Backblaze B2
    const b2 = new BackblazeB2({
      applicationKeyId: process.env.B2_KEY_ID as string,
      applicationKey: process.env.B2_APPLICATION_KEY as string,
    });

    await b2.authorize();

    // Pobranie bucketu
    const bucketName = process.env.B2_BUCKET_NAME as string;
    const buckets = await b2.listBuckets();

    const bucket = buckets.data.buckets.find((b: B2Bucket) => b.bucketName === bucketName);

    if (!bucket) {
      return NextResponse.json({ error: 'Bucket nie znaleziony' }, { status: 404 });
    }

    // Pobranie URL do uploadu
    const uploadUrlData = await b2.getUploadUrl({ bucketId: bucket.bucketId });

    // Przesyłanie pliku
    await b2.uploadFile({
      uploadUrl: uploadUrlData.data.uploadUrl,
      uploadAuthToken: uploadUrlData.data.authorizationToken,
      fileName: fileName,
      data: fileBuffer,
    });

    return NextResponse.json({
      message: 'Plik przesłany!',
      fileUrl: `https://f002.backblazeb2.com/file/${bucketName}/${fileName}`,
    });
  } catch (error) {
    console.error('Błąd uploadu:', error);
    return NextResponse.json({ error: 'Wystąpił błąd' }, { status: 500 });
  }
}
