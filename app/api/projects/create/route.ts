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
const B2_ENDPOINT = `s3.us-east-005.backblazeb2.com/${BUCKET_NAME}`; // Dostosuj URL do swojego regionu

export async function POST(req: NextRequest) {
  try {
    console.log("Start handling POST request.");

    const formData = await req.formData();
    const userId = formData.get("user_id") as string;
    const subjectName = formData.get("subject_name") as string;
    const notePreferences = formData.get("note_preferences") as string | null;
    const files = formData.getAll("attached_files") as File[];

    // 1. Walidacja wymaganych pól
    if (!userId ) {
      console.error("Missing required field: user_id ");
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!subjectName) {
        console.error("Missing required field: subject_name")
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    console.log("Creating project in database...");
    // 2. Tworzenie projektu w bazie
    const project = await prisma.project.create({
      data: {
        user_id: Number(userId),
        subject_name: subjectName,
        note_preferences: notePreferences,
      },
    });

    const projectId = project.id;
    const uploadedFiles = [];

    // 3. Autoryzacja w Backblaze
    console.log("Authorizing with Backblaze...");
    try {
      await b2.authorize();
      console.log("Backblaze authorization successful.");
    } catch (authError) {
      console.error("Error during Backblaze authorization:", authError);
      return NextResponse.json({ error: "Backblaze authorization failed" }, { status: 500 });
    }

    console.log("Fetching upload URL from Backblaze...");
    // Pobranie URL do przesyłania plików
    let uploadUrlData;
    try {
      uploadUrlData = await b2.getUploadUrl({ bucketId: process.env.B2_BUCKET_ID! });
      console.log("Upload URL fetched successfully.");
    } catch (uploadUrlError) {
      console.error("Error fetching upload URL from Backblaze:", uploadUrlError);
      return NextResponse.json({ error: "Error fetching upload URL from Backblaze" }, { status: 500 });
    }

    // Przesyłanie plików do Backblaze
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const fileName = `${userId}/${Date.now()}-${file.name}`;

      console.log(`Uploading file: ${fileName}`);
      try {
        const uploadResponse = await b2.uploadFile({
          uploadUrl: uploadUrlData.data.uploadUrl,
          uploadAuthToken: uploadUrlData.data.authorizationToken,
          fileName: fileName,
          data: buffer,
          mime: file.type,
        });

        const fileUrl = `${B2_ENDPOINT}/${fileName}`;
        uploadedFiles.push({ name: file.name, url: fileUrl });

        // 4. Insert do attached_file
        console.log(`Inserting file metadata into database: ${file.name}`);
        await prisma.attached_file.create({
          data: {
            project_id: projectId,
            file_name: file.name,
            file_path: fileUrl,
          },
        });
      } catch (fileUploadError) {
        console.error(`Error uploading file ${file.name}:`, fileUploadError);
        return NextResponse.json({ error: "Error uploading file" }, { status: 500 });
      }
    }

    console.log("Project created successfully with uploaded files.");
    return NextResponse.json({
      message: "Project created successfully",
      projectId,
      uploadedFiles,
    });
  } catch (error) {
    console.error("Error in the POST request handler:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
