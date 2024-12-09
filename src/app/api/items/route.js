import { kv } from "@vercel/kv";
import { NextResponse } from "next/server";

const ITEMS_KEY = "items";

export async function GET() {
  try {
    const items = await kv.get(ITEMS_KEY);
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
    const items = await request.json();
    await kv.set(ITEMS_KEY, items);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving items:", error);
    return NextResponse.json(
      { error: "Failed to save items" },
      { status: 500 }
    );
  }
}
