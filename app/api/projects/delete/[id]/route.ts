import { NextResponse } from "next/server";
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

export async function DELETE(req: Request, context: any) {
  try {
    const { params } = context;

    // Ensure params are awaited before use
    const projectId = await params?.id ? parseInt(params.id, 10) : null;

    if (!projectId || isNaN(projectId)) {
      return NextResponse.json({ message: "Invalid or missing project ID" }, { status: 400 });
    }

    console.log(`🔍 Fetching attached files for project ${projectId}`);
    const attachedFiles = await prisma.attached_file.findMany({
      where: { project_id: projectId },
    });

    if (attachedFiles.length > 0) {
      console.log(`🗑 Removing ${attachedFiles.length} files from Backblaze B2`);

      for (const file of attachedFiles) {
        try {
          const fileName = file.file_path?.split("/").slice(-3).join("/"); // Extracts "userId/projectId/fileName"
          if (!fileName) continue;

          // Usunięcie pliku z Backblaze B2
          const deleteParams = {
            Bucket: BUCKET_NAME,
            Key: fileName,
          };

          await s3.deleteObject(deleteParams).promise(); // Usuwanie pliku z B2
          console.log(`✅ Deleted from B2: ${fileName}`);
        } catch (err) {
          console.error(`❌ Error deleting file from B2: ${file.file_name}`, err);
        }
      }
    }

    console.log(`🗑 Removing database records for project ${projectId}`);
    await prisma.attached_file.deleteMany({ where: { project_id: projectId } });
    await prisma.chunk.deleteMany({ where: { project_id: projectId } });
    await prisma.notes.deleteMany({ where: { project_id: projectId } });
    await prisma.tests.deleteMany({ where: { project_id: projectId } });

    await prisma.project.delete({ where: { project_id: projectId } });

    return NextResponse.json({ message: "Project deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("❌ Error deleting project:", error);
    return NextResponse.json({ message: "Failed to delete project", error }, { status: 500 });
  }
}
