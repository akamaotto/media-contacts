import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { 
  getCountriesForRegion, 
  addCountriesToRegion, 
  removeCountriesFromRegion,
  setCountriesForRegion 
} from "@/backend/regions/actions";

// GET /api/regions/[code]/countries - Get countries for a region
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await params;
    const countries = await getCountriesForRegion(code);
    
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
  { params }: { params: Promise<{ code: string }> }
) {
  let regionCode: string = '';
  let requestData: any = null;
  
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await params;
    regionCode = code;
    requestData = await request.json();
    const { countryIds } = requestData;

    if (!countryIds || !Array.isArray(countryIds)) {
      return NextResponse.json(
        { error: "Country IDs array is required" },
        { status: 400 }
      );
    }

    console.log('Adding countries to region:', { regionCode: code, countryIds });
    await addCountriesToRegion(code, countryIds);
    
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
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await params;
    const { countryIds } = await request.json();

    if (!countryIds || !Array.isArray(countryIds)) {
      return NextResponse.json(
        { error: "Country IDs array is required" },
        { status: 400 }
      );
    }

    await setCountriesForRegion(code, countryIds);
    
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
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await params;
    const { countryIds } = await request.json();

    if (!countryIds || !Array.isArray(countryIds)) {
      return NextResponse.json(
        { error: "Country IDs array is required" },
        { status: 400 }
      );
    }

    await removeCountriesFromRegion(code, countryIds);
    
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
