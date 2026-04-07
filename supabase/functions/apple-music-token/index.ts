const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Convert PEM to CryptoKey
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');

  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  return await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
}

function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function textToBase64Url(text: string): string {
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateAppleMusicToken(
  privateKey: string,
  keyId: string,
  teamId: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 15777000; // ~6 months

  const header = { alg: 'ES256', kid: keyId };
  const payload = { iss: teamId, iat: now, exp: expiry };

  const encodedHeader = textToBase64Url(JSON.stringify(header));
  const encodedPayload = textToBase64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await importPrivateKey(privateKey);

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput)
  );

  // Convert DER signature to raw r||s format expected by JWT
  const sigArray = new Uint8Array(signature);
  const encodedSignature = base64UrlEncode(sigArray);

  return `${signingInput}.${encodedSignature}`;
}

// Cache the token in memory (edge function instance)
let cachedToken: string | null = null;
let cachedExpiry = 0;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const APPLE_MUSIC_PRIVATE_KEY = Deno.env.get('APPLE_MUSIC_PRIVATE_KEY');
  const APPLE_MUSIC_KEY_ID = Deno.env.get('APPLE_MUSIC_KEY_ID');
  const APPLE_MUSIC_TEAM_ID = Deno.env.get('APPLE_MUSIC_TEAM_ID');

  if (!APPLE_MUSIC_PRIVATE_KEY) {
    return new Response(JSON.stringify({ error: 'APPLE_MUSIC_PRIVATE_KEY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!APPLE_MUSIC_KEY_ID) {
    return new Response(JSON.stringify({ error: 'APPLE_MUSIC_KEY_ID not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  if (!APPLE_MUSIC_TEAM_ID) {
    return new Response(JSON.stringify({ error: 'APPLE_MUSIC_TEAM_ID not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const now = Math.floor(Date.now() / 1000);

    // Return cached token if still valid (with 1h buffer)
    if (cachedToken && cachedExpiry > now + 3600) {
      return new Response(JSON.stringify({ token: cachedToken }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = await generateAppleMusicToken(
      APPLE_MUSIC_PRIVATE_KEY,
      APPLE_MUSIC_KEY_ID,
      APPLE_MUSIC_TEAM_ID
    );

    cachedToken = token;
    cachedExpiry = now + 15777000;

    return new Response(JSON.stringify({ token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    console.error('apple-music-token error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
