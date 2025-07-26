import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllRegions, createRegion } from "@/backend/regions/actions";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const regions = await getAllRegions();
    return NextResponse.json(regions);
  } catch (error) {
    console.error("Error fetching regions:", error);
    return NextResponse.json(
      { error: "Failed to fetch regions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { code, name, category, parentCode, description } = body;

    // Basic validation
    if (!code || !name || !category) {
      return NextResponse.json(
        { error: "Code, name, and category are required" },
        { status: 400 }
      );
    }

    // Validate code format
    if (!/^[A-Z0-9_]+$/.test(code)) {
      return NextResponse.json(
        { error: "Code must contain only uppercase letters, numbers, and underscores" },
        { status: 400 }
      );
    }

    // Create new region in database
    const newRegion = await createRegion({
      code,
      name,
      category,
      parentCode: parentCode || undefined,
      description: description || undefined,
    });
    
    return NextResponse.json(
      { message: "Region created successfully", region: newRegion },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating region:", error);
    return NextResponse.json(
      { error: "Failed to create region" },
      { status: 500 }
    );
  }
}
