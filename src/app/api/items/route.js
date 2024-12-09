import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project");

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID required" },
        { status: 400 }
      );
    }

    const key = `project:${projectId}:items`;
    const items = await kv.get(key);
    return NextResponse.json(items || []);
  } catch (error) {
    console.error("Error fetching items:", error);
    return NextResponse.json(
      { error: "Failed to fetch items" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project");

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID required" },
        { status: 400 }
      );
    }

    const items = await request.json();
    const key = `project:${projectId}:items`;
    await kv.set(key, items);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving items:", error);
    return NextResponse.json(
      { error: "Failed to save items" },
      { status: 500 }
    );
  }
}
