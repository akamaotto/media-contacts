import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/database/prisma";

export const dynamic = 'force-dynamic';

// GET /api/regions/[code]/countries - Get countries for a region
export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = params;
    const region = await prisma.regions.findUnique({
      where: { code },
      include: { countries: true },
    });
    const countries = region?.countries ?? [];
    
    return NextResponse.json(countries);
  } catch (error) {
    console.error("Error fetching countries for region:", error);
    return NextResponse.json(
      { error: "Failed to fetch countries for region" },
      { status: 500 }
    );
  }
}

// POST /api/regions/[code]/countries - Add countries to a region
export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  let regionCode: string = '';
  let requestData: { countryIds?: string[] } | null = null;
  
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = params;
    regionCode = code;
    requestData = await request.json();
    const countryIds = requestData?.countryIds;

    if (!countryIds || !Array.isArray(countryIds)) {
      return NextResponse.json(
        { error: "Country IDs array is required" },
        { status: 400 }
      );
    }

    await prisma.regions.update({
      where: { code },
      data: {
        countries: {
          connect: countryIds.map((id: string) => ({ id })),
        },
      },
    });
    
    return NextResponse.json(
      { message: "Countries added to region successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error adding countries to region:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: "Failed to add countries to region",
        details: errorMessage,
        regionCode: regionCode,
        requestData: requestData
      },
      { status: 500 }
    );
  }
}

// PUT /api/regions/[code]/countries - Set countries for a region (replace all)
export async function PUT(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = params;
    const { countryIds } = await request.json();

    if (!countryIds || !Array.isArray(countryIds)) {
      return NextResponse.json(
        { error: "Country IDs array is required" },
        { status: 400 }
      );
    }

    await prisma.regions.update({
      where: { code },
      data: {
        countries: {
          set: countryIds.map((id: string) => ({ id })),
        },
      },
    });
    
    return NextResponse.json(
      { message: "Countries set for region successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error setting countries for region:", error);
    return NextResponse.json(
      { error: "Failed to set countries for region" },
      { status: 500 }
    );
  }
}

// DELETE /api/regions/[code]/countries - Remove countries from a region
export async function DELETE(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = params;
    const { countryIds } = await request.json();

    if (!countryIds || !Array.isArray(countryIds)) {
      return NextResponse.json(
        { error: "Country IDs array is required" },
        { status: 400 }
      );
    }

    await prisma.regions.update({
      where: { code },
      data: {
        countries: {
          disconnect: countryIds.map((id: string) => ({ id })),
        },
      },
    });
    
    return NextResponse.json(
      { message: "Countries removed from region successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error removing countries from region:", error);
    return NextResponse.json(
      { error: "Failed to remove countries from region" },
      { status: 500 }
    );
  }
}
