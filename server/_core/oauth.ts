import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");

    if (!code) {
      res.status(400).json({ error: "code is required" });
      return;
    }

    const clientId = process.env.VITE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error(
        "[OAuth] OAUTH_CLIENT_ID and/or OAUTH_CLIENT_SECRET are not configured"
      );
      res
        .status(500)
        .json({ error: "OAuth client credentials are not configured" });
      return;
    }

    // Build redirect URI to match what the frontend uses
    const redirectUri = `${req.protocol}://${req.get("host")}/api/oauth/callback`;

    try {
      // Exchange authorization code for tokens with Google
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }).toString(),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error(
          "[OAuth] Failed to exchange code for tokens:",
          tokenResponse.status,
          tokenResponse.statusText,
          errorText
        );
        res
          .status(500)
          .json({ error: "Failed to exchange authorization code for tokens" });
        return;
      }

      const tokenJson = (await tokenResponse.json()) as {
        access_token?: string;
        id_token?: string;
      };

      const accessToken = tokenJson.access_token;

      if (!accessToken) {
        console.error("[OAuth] No access_token returned from Google");
        res.status(500).json({ error: "No access token returned from Google" });
        return;
      }

      // Fetch user info from Google
      const userInfoResponse = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!userInfoResponse.ok) {
        const errorText = await userInfoResponse.text();
        console.error(
          "[OAuth] Failed to fetch user info:",
          userInfoResponse.status,
          userInfoResponse.statusText,
          errorText
        );
        res.status(500).json({ error: "Failed to fetch user info from Google" });
        return;
      }

      const googleUser = (await userInfoResponse.json()) as {
        id?: string;
        name?: string;
        email?: string;
        picture?: string;
      };

      if (!googleUser.id) {
        res.status(400).json({ error: "id missing from Google user info" });
        return;
      }

      const openId = `google_${googleUser.id}`;
      const now = new Date();
      const displayName = googleUser.name || googleUser.email || "";

      await db.upsertUser({
        openId,
        name: googleUser.name || null,
        email: googleUser.email ?? null,
        loginMethod: "google",
        lastSignedIn: now,
      });

      const sessionToken = await sdk.createSessionToken(openId, {
        name: displayName,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
