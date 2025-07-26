import { NextRequest, NextResponse } from "next/server";
import { getCountries, createCountry, type CreateCountryData } from "@/backend/countries/actions";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("Fetching countries data via API...");
    
    // Fetch countries with media contacts count
    const countries = await getCountries();
    
    console.log(`API: Successfully fetched ${countries.length} countries`);
    
    return NextResponse.json({
      countries,
      total: countries.length,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error("Countries API error:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to fetch countries",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/countries - Create a new country
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    
    // Create country using backend action
    const result = await createCountry(body as CreateCountryData);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        message: result.message,
        data: result.data 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating country:', error);
    return NextResponse.json(
      { error: 'Failed to create country' },
      { status: 500 }
    );
  }
}
