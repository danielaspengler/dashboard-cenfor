import crypto from "crypto";

// Autenticación server-to-server con la cuenta de servicio de Google.
// Sin librerías externas: se firma un JWT y se canjea por un access token.
// Mismo mecanismo que el dashboard maestro de Papanato.

function base64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

let cached: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  // Un sync lee varias planillas seguidas; no hace falta pedir un token
  // nuevo para cada una.
  if (cached && Date.now() < cached.expiresAt - 60_000) return cached.token;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(
    /\\n/g,
    "\n",
  );

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), privateKey);
  const jwt = `${unsigned}.${base64url(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    throw new Error(`Google OAuth respondió ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  cached = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cached.token;
}

// Por qué UNFORMATTED_VALUE y no el texto que se ve en pantalla:
//
// Las planillas de CENFOR tienen las fechas con un formato de celda que
// usa "AAAA" para el año. Google Sheets no lo interpreta y lo escribe
// literal, así que el texto visible es "27/08/AAAA 12:00" en mystery
// shopper y "21/08" en auditorías — sin año por ningún lado.
//
// Sin formato, Google devuelve el número de serie interno de la fecha,
// que siempre trae el año completo. El sync deja de depender de cómo el
// cliente formatee sus celdas, que es algo que puede cambiar cualquier día
// sin avisar.
const RENDER = "valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER";

/** Valores de un rango, sin formatear (fechas como número de serie). */
export async function fetchSheetValues(
  spreadsheetId: string,
  range: string,
): Promise<string[][]> {
  const token = await getAccessToken();
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?${RENDER}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    throw new Error(`Sheets API respondió ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return json.values ?? [];
}

/**
 * Nombres de las pestañas de una planilla.
 * Lo necesita el sync de auditorías: la planilla tiene una pestaña por
 * local y pueden agregar o renombrar sin avisar, así que se recorren
 * todas en vez de listarlas a mano en el código.
 */
export async function fetchSheetTitles(spreadsheetId: string): Promise<string[]> {
  const token = await getAccessToken();
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    throw new Error(`Sheets API respondió ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return (json.sheets ?? []).map(
    (s: { properties: { title: string } }) => s.properties.title,
  );
}

/** Varios rangos en una sola llamada (batchGet). */
export async function fetchSheetRanges(
  spreadsheetId: string,
  ranges: string[],
): Promise<Record<string, string[][]>> {
  const token = await getAccessToken();
  const qs = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join("&");
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${qs}&${RENDER}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    throw new Error(`Sheets API respondió ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  const out: Record<string, string[][]> = {};
  for (let i = 0; i < ranges.length; i++) {
    out[ranges[i]] = json.valueRanges?.[i]?.values ?? [];
  }
  return out;
}
