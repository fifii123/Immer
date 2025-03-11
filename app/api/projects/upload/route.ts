import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import B2 from "backblaze-b2";
import { config } from "dotenv";

config();
const prisma = new PrismaClient();

const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID!,
  applicationKey: process.env.B2_APPLICATION_KEY!,
});

const BUCKET_NAME = process.env.B2_BUCKET_NAME!;
const B2_ENDPOINT = `https://s3.us-east-005.backblazeb2.com/${BUCKET_NAME}`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const userId = formData.get("user_id") as string;
    const projectId = formData.get("project_id") as string;
    const files = formData.getAll("attached_files") as File[];

    if (!userId || !projectId) {
      return NextResponse.json({ error: "Missing user_id or project_id" }, { status: 400 });
    }

    console.log("Authorizing with Backblaze...");
    await b2.authorize();
    const uploadUrlData = await b2.getUploadUrl({ bucketId: process.env.B2_BUCKET_ID! });

    const uploadedFiles = [];

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Ścieżka pliku w Backblaze: userId/projectId/plik
      const fileName = `${userId}/${projectId}/${file.name}`;

      console.log(`Uploading file: ${fileName}`);
      const uploadResponse = await b2.uploadFile({
        uploadUrl: uploadUrlData.data.uploadUrl,
        uploadAuthToken: uploadUrlData.data.authorizationToken,
        fileName: fileName,
        data: buffer,
        mime: file.type,
      });

      const fileUrl = `${B2_ENDPOINT}/${fileName}`;
      uploadedFiles.push({ name: file.name, url: fileUrl });

      // Zapis do bazy danych
      console.log(`Saving file metadata in database: ${file.name}`);
      await prisma.attached_file.create({
        data: {
          project_id: Number(projectId),
          file_name: file.name,
          file_path: fileUrl,
        },
      });
    }

    return NextResponse.json({
      message: "Files uploaded successfully",
      uploadedFiles,
    });
  } catch (error) {
    console.error("Error in file upload:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
