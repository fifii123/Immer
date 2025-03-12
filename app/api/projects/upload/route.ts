import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import AWS from "aws-sdk";

config();
const prisma = new PrismaClient();

// Configure AWS S3 to use Backblaze's S3-Compatible endpoint
const s3 = new AWS.S3({
  accessKeyId: process.env.B2_KEY_ID!, // Your Backblaze B2 key ID
  secretAccessKey: process.env.B2_APPLICATION_KEY!, // Your Backblaze B2 application key
  endpoint: new AWS.Endpoint('https://s3.us-east-005.backblazeb2.com'), // Backblaze S3 endpoint
  s3ForcePathStyle: true, // Required for Backblaze S3 compatibility
  signatureVersion: 'v4', // Signature version for S3 API
});

const BUCKET_NAME = process.env.B2_BUCKET_NAME!;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const userId = formData.get("user_id") as string;
    const projectId = formData.get("project_id") as string;
    const files = formData.getAll("attached_files") as File[];

    if (!userId || !projectId) {
      return NextResponse.json({ error: "Missing user_id or project_id" }, { status: 400 });
    }

    const uploadedFiles = [];

    // Iterate through the files and upload each to Backblaze
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const fileName = `${userId}/${projectId}/${file.name}`;
      const fileMimeType = file.type;

      // Upload the file to Backblaze S3-compatible storage
      const uploadParams = {
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: buffer,
        ContentType: fileMimeType,
      };

      const uploadResponse = await s3.upload(uploadParams).promise();

      // The URL of the uploaded file in Backblaze S3
      const fileUrl = `https://${BUCKET_NAME}.s3.us-east-005.backblazeb2.com/${fileName}`;
      uploadedFiles.push({ name: file.name, url: fileUrl });

      // Save file metadata to the database
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
    return NextResponse.json({ error: error || "Internal server error" }, { status: 500 });
  }
}
