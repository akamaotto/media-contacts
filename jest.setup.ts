// Minimal Web API polyfills for Next.js route testing in Node environment
// Provide bare constructors so `next/server` can extend them without crashing.

if (typeof globalThis.Request === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).Request = class Request {};
}

if (typeof globalThis.Response === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).Response = class Response {
    // simple json helper to be returned by fetch stubs if needed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static json(body: any, init?: any) {
      return new (globalThis as any).Response(body, init);
    }
  };
}

if (typeof globalThis.Headers === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).Headers = class Headers {};
}

// Add testing library jest-dom matchers
import '@testing-library/jest-dom';