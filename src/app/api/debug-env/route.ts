import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Debug environment variables in production
    const debugInfo = {
      hasAuthSecret: !!process.env.AUTH_SECRET,
      authSecretLength: process.env.AUTH_SECRET?.length || 0,
      hasAuthUrl: !!process.env.AUTH_URL,
      authUrl: process.env.AUTH_URL,
      hasTrustHost: !!process.env.AUTH_TRUST_HOST,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      status: "ok",
      message: "Environment debug info",
      debug: debugInfo,
    });
  } catch (error) {
    console.error("Debug env error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to get debug info",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
