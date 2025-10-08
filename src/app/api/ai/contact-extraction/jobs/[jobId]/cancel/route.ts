/**
 * Cancel Extraction Job API Route
 * POST /api/ai/contact-extraction/jobs/[jobId]/cancel
 */

import { NextRequest, NextResponse } from 'next/server';
import { ContactExtractionController } from '../../../controller';

const controller = new ContactExtractionController();

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const response = await controller.cancelExtractionJob(request, params);
    return response;
  } catch (error) {
    console.error('Cancel extraction job API error:', error);
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
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}