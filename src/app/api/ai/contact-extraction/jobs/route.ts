/**
 * Extraction Jobs List API Route
 * GET /api/ai/contact-extraction/jobs
 */

import { NextRequest, NextResponse } from 'next/server';
import { ContactExtractionController } from '../controller';

const controller = new ContactExtractionController();

export async function GET(request: NextRequest) {
  try {
    const response = await controller.listExtractionJobs(request);
    return response;
  } catch (error) {
    console.error('List extraction jobs API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}