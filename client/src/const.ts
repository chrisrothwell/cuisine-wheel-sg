export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate Google OAuth login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  // NOTE: On the client, Vite only exposes variables that start with VITE_
  const clientId =
    import.meta.env.VITE_OAUTH_CLIENT_ID ?? import.meta.env.VITE_APP_ID;

  if (!clientId) {
    console.error(
      "[Auth] VITE_OAUTH_CLIENT_ID (or VITE_APP_ID) is not configured. Please set it in your .env file."
    );
    return "#";
  }

  const redirectUri = `${window.location.origin}/api/oauth/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid profile email",
    access_type: "online",
    include_granted_scopes: "true",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};
