import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllLanguages, createLanguage } from '@/backend/languages/actions';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const languages = await getAllLanguages();
    
    return NextResponse.json({
      languages,
      total: languages.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching languages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch languages' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let code = '';
  let name = '';
  
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    ({ code, name } = body);

    // Basic validation
    if (!code || !name) {
      return NextResponse.json(
        { error: 'Language code and name are required' },
        { status: 400 }
      );
    }

    // Create language in database
    const newLanguage = await createLanguage({
      code: code.toLowerCase(),
      name: name.trim()
    });

    return NextResponse.json({
      message: 'Language created successfully',
      language: newLanguage
    });
  } catch (error) {
    console.error('Error creating language:', error);
    
    // Handle specific database errors
    let errorMessage = 'Failed to create language';
    
    if (error instanceof Error) {
      // Check for unique constraint violations
      if (error.message.includes('Unique constraint') || error.message.includes('unique constraint')) {
        if (error.message.includes('code')) {
          errorMessage = `Language code '${code}' already exists`;
        } else if (error.message.includes('name')) {
          errorMessage = `Language name '${name}' already exists`;
        } else {
          errorMessage = 'A language with this code or name already exists';
        }
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
