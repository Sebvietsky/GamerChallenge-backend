import env from "../config/env";

interface IGDBTokenCache {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: IGDBTokenCache | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.accessToken;
  }

  const response = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${env.igdbClientId}&client_secret=${env.igdbClientSecret}&grant_type=client_credentials`,
    { method: "POST" }
  );

  if (!response.ok) {
    throw new Error(`Failed to get IGDB access token: ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return tokenCache.accessToken;
}

// Envoie une requête à un endpoint IGDB (ex: "games", "platforms", "covers"...).
// Le body est une chaîne au format Apicalypse (langage de requête propriétaire d'IGDB) :
//   fields name, cover.url, platforms.name;
//   search "Elden Ring";
//   where version_parent = null;
//   limit 10;
// T correspond à la forme de la réponse attendue selon l'endpoint interrogé.
// Actuellement utilisé uniquement avec l'endpoint "games" → T = IGDBGame[].
export async function queryIGDB<T>(endpoint: string, body: string): Promise<T> {
  const accessToken = await getAccessToken();

  const response = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: "POST",
    headers: {
      "Client-ID": env.igdbClientId,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "text/plain",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`IGDB API error on /${endpoint}: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// IGDB retourne les URLs d'image sous une forme incomplète, par exemple :
//   //images.igdb.com/igdb/image/upload/t_thumb/co4jni.jpg
//
// Deux problèmes à corriger :
//   1. L'URL commence par "//" sans protocole → on ajoute "https:" devant
//   2. Le segment de taille (ex: "t_thumb") → on le remplace par la taille voulue
//
// Tailles disponibles : https://api-docs.igdb.com/#images
export function buildImageUrl(
  url: string,
  size: "cover_big" | "thumb" | "screenshot_huge" | "1080p" | "original" = "cover_big"
): string {
  return `https:${url.replace(/t_[^/]+/, `t_${size}`)}`;
}

export const buildCoverUrl = (url: string) => buildImageUrl(url, "cover_big");
