import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateLanguage, deleteLanguage, getAllLanguages } from '@/backend/languages/actions';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code: paramCode } = await params;
    const body = await request.json();
    const { code, name, countries } = body;

    // Basic validation
    if (!code || !name) {
      return NextResponse.json(
        { error: 'Language code and name are required' },
        { status: 400 }
      );
    }

    // Find the language by code to get its ID
    const allLanguages = await getAllLanguages();
    const existingLanguage = allLanguages.find(lang => lang.code === paramCode);
    
    if (!existingLanguage || !existingLanguage.id) {
      return NextResponse.json(
        { error: 'Language not found' },
        { status: 404 }
      );
    }

    // Update language in database with country assignments
    const updatedLanguage = await updateLanguage(existingLanguage.id, {
      code: code.toLowerCase(),
      name: name.trim()
    }, countries || []);

    return NextResponse.json({
      message: 'Language updated successfully',
      language: updatedLanguage
    });
  } catch (error) {
    console.error('Error updating language:', error);
    return NextResponse.json(
      { error: 'Failed to update language' },
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await params;

    if (!code) {
      return NextResponse.json(
        { error: 'Language code is required' },
        { status: 400 }
      );
    }

    // Find the language by code to get its ID
    const allLanguages = await getAllLanguages();
    const existingLanguage = allLanguages.find(lang => lang.code === code);
    
    if (!existingLanguage || !existingLanguage.id) {
      return NextResponse.json(
        { error: 'Language not found' },
        { status: 404 }
      );
    }

    // Delete language from database
    await deleteLanguage(existingLanguage.id);

    return NextResponse.json({
      message: 'Language deleted successfully',
      code: code.toLowerCase()
    });
  } catch (error) {
    console.error('Error deleting language:', error);
    return NextResponse.json(
      { error: 'Failed to delete language' },
      { status: 500 }
    );
  }
}
