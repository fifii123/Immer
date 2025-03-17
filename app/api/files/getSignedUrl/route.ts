// /api/files/getSignedUrl/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import AWS from "aws-sdk";
import jwt from "jsonwebtoken";

config();
import { prisma } from "../../../../lib/prisma"
const SECRET_KEY = process.env.JWT_SECRET_KEY || "secret_key";

// Configure AWS S3 to use Backblaze's S3-Compatible endpoint
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
    // Get the file_id from query params
    const url = new URL(request.url);
    const fileId = url.searchParams.get("fileId");
    
    if (!fileId) {
      return NextResponse.json({ error: "Missing file_id" }, { status: 400 });
    }

    // Authenticate the user
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, SECRET_KEY) as { userId: number };
    const userId = decoded.userId;

    // Get the file from database
    const file = await prisma.attached_file.findUnique({
      where: { file_id: Number(fileId) },
      include: { project: true }
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Verify the file belongs to the user's project
    // Add null check for project
    if (!file.project || file.project.user_id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Extract the key from the file_path
    // First check if file_path exists
    if (!file.file_path) {
      return NextResponse.json({ error: "File path not found" }, { status: 500 });
    }

    // Parse the file path URL
    try {
      const filePathUrl = new URL(file.file_path);
      const key = filePathUrl.pathname.substring(1); // Remove leading slash

      // Generate a pre-signed URL (valid for 15 minutes)
      const signedUrl = s3.getSignedUrl('getObject', {
        Bucket: BUCKET_NAME,
        Key: key,
        Expires: 900 // 15 minutes in seconds
      });

      return NextResponse.json({ signedUrl });
    } catch (error) {
      console.error("Error parsing file path URL:", error);
      return NextResponse.json({ error: "Invalid file path" }, { status: 500 });
    }
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}