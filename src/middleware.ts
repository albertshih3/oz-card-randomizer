import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Apply Clerk middleware only to the /edit route and its subpaths
    '/edit/:path*',
  ],
};
