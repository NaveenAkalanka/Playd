import { auth } from "@/lib/auth/server";

export default auth.middleware({
  loginUrl: "/auth/sign-in",
});

export const config = {
  // Skip auth routes, Next internals, and any path with a file extension
  // (public/ assets like /icon-mark.svg, /logo.svg, the /icon.svg favicon).
  // Without the extension rule those requests were redirected to the
  // sign-in page while signed out, which broke the logo on the auth screens.
  // App routes never contain a dot, so this can't skip a protected page.
  matcher: ["/((?!api/auth|auth|_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
