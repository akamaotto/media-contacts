// Type declarations for API route imports in tests
declare module '@/app/api/filters/countries/route' {
  import type { NextRequest, NextResponse } from 'next/server';
  export function GET(request: NextRequest): Promise<NextResponse>;
}

declare module '@/app/api/filters/beats/route' {
  import type { NextRequest, NextResponse } from 'next/server';
  export function GET(request: NextRequest): Promise<NextResponse>;
}

declare module '@/app/api/filters/outlets/route' {
  import type { NextRequest, NextResponse } from 'next/server';
  export function GET(request: NextRequest): Promise<NextResponse>;
}

declare module '@/app/api/filters/regions/route' {
  import type { NextRequest, NextResponse } from 'next/server';
  export function GET(request: NextRequest): Promise<NextResponse>;
}

declare module '@/app/api/filters/languages/route' {
  import type { NextRequest, NextResponse } from 'next/server';
  export function GET(request: NextRequest): Promise<NextResponse>;
}