import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

config();
import { prisma } from "../../../../lib/prisma"

export async function POST(req: NextRequest) {
  try {
    console.log("Received request to create project");

    const { user_id, subject_name, note_preferences } = await req.json();
    console.log("Parsed request body:", { user_id, subject_name, note_preferences });

    if (!user_id) {
      console.log("Missing user_id");
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }
    
    if (!subject_name) {
      console.log("Missing subject_name");
      return NextResponse.json({ error: "Missing subject_name" }, { status: 400 });
    }
    
    if (!note_preferences) {
      console.log("Missing note_preferences");
      return NextResponse.json({ error: "Missing note_preferences" }, { status: 400 });
    }

    // Konwersja user_id na liczbę
    const userIdNumber = Number(user_id);
    console.log("Converted user_id to number:", userIdNumber);

    // Sprawdzanie, czy konwersja była poprawna
    if (isNaN(userIdNumber)) {
      console.log("Invalid user_id, must be a valid number");
      return NextResponse.json({ error: "Invalid user_id, must be a valid number" }, { status: 400 });
    }

    // Tworzenie projektu w bazie danych
    console.log("Creating project with user_id:", userIdNumber, "subject_name:", subject_name);
    const project = await prisma.project.create({
      data: {
        user_id: userIdNumber,
        subject_name,
        note_preferences,
      },
    });

    console.log("Project created successfully:", project);
    return NextResponse.json({
      message: "Project created successfully",
      projectId: project.project_id,
    });
  } catch (error) {
    console.error("Error in project creation:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
