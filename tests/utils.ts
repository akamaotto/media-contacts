import { APIRequestContext, BrowserContext } from '@playwright/test';

export async function loginViaApi(request: APIRequestContext, context: BrowserContext, baseURL: string, email: string, password: string) {
  // Call NextAuth credentials callback directly to obtain session cookies
  const res = await request.post(`${baseURL}/api/auth/callback/credentials?json=true`, {
    headers: {
      'Content-Type': 'application/json'
    },
    data: {
      email,
      password,
      redirect: false,
    },
  });
  if (!res.ok()) {
    throw new Error(`Login API failed: ${res.status()} ${await res.text()}`);
  }

  // Extract set-cookie headers
  const setCookies = res.headersArray().filter(h => h.name.toLowerCase() === 'set-cookie').map(h => h.value);
  const { hostname } = new URL(baseURL);
  const cookiesForPlaywright = setCookies.map(raw => {
    const [cookiePart] = raw.split(';');
    const [name, value] = cookiePart.split('=');
    return {
      name,
      value,
      domain: hostname,
      path: '/',
      httpOnly: raw.toLowerCase().includes('httponly'),
      secure: raw.toLowerCase().includes('secure'),
      sameSite: raw.toLowerCase().includes('samesite=lax') ? 'Lax' : raw.toLowerCase().includes('samesite=strict') ? 'Strict' : 'None',
      expires: Math.floor(Date.now() / 1000) + 60 * 60, // 1h
    } as const;
  });

  await context.addCookies(cookiesForPlaywright as any);
}
