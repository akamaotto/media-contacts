import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateRegion, deleteRegion } from "@/backend/regions/actions";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await params;
    const body = await request.json();
    const { name, category, parentCode, description } = body;

    // Basic validation
    if (!name || !category) {
      return NextResponse.json(
        { error: "Name and category are required" },
        { status: 400 }
      );
    }

    // Update region in database
    const updatedRegion = await updateRegion(code, {
      name,
      category,
      parentCode: parentCode || undefined,
      description: description || undefined,
    });
    
    return NextResponse.json(
      { message: "Region updated successfully", region: updatedRegion },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating region:", error);
    return NextResponse.json(
      { error: "Failed to update region" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await params;

    // Delete region from database
    await deleteRegion(code);
    
    return NextResponse.json(
      { message: "Region deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting region:", error);
    return NextResponse.json(
      { error: "Failed to delete region" },
      { status: 500 }
    );
  }
}
