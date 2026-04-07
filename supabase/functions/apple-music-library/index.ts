const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  return await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
}

function textToBase64Url(text: string): string {
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function generateDeveloperToken(privateKey: string, keyId: string, teamId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 15777000;

  const header = { alg: 'ES256', kid: keyId };
  const payload = { iss: teamId, iat: now, exp: expiry };

  const signingInput = `${textToBase64Url(JSON.stringify(header))}.${textToBase64Url(JSON.stringify(payload))}`;

  const key = await importPrivateKey(privateKey);
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput),
  );

  const encodedSignature = base64UrlEncode(new Uint8Array(signature));
  return `${signingInput}.${encodedSignature}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const APPLE_MUSIC_PRIVATE_KEY = Deno.env.get('APPLE_MUSIC_PRIVATE_KEY');
  const APPLE_MUSIC_KEY_ID = Deno.env.get('APPLE_MUSIC_KEY_ID');
  const APPLE_MUSIC_TEAM_ID = Deno.env.get('APPLE_MUSIC_TEAM_ID');

  if (!APPLE_MUSIC_PRIVATE_KEY || !APPLE_MUSIC_KEY_ID || !APPLE_MUSIC_TEAM_ID) {
    return new Response(JSON.stringify({ error: 'Apple Music credentials not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const action =
      typeof body.action === 'string'
        ? body.action
        : body.song_id && body.music_user_token
          ? 'add_to_library'
          : '';
    const music_user_token = body.music_user_token;

    if (!music_user_token || typeof music_user_token !== 'string') {
      return new Response(JSON.stringify({ error: 'music_user_token required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const devToken = await generateDeveloperToken(
      APPLE_MUSIC_PRIVATE_KEY,
      APPLE_MUSIC_KEY_ID,
      APPLE_MUSIC_TEAM_ID,
    );

    const appleHeaders = {
      Authorization: `Bearer ${devToken}`,
      'Music-User-Token': music_user_token,
    };

    if (action === 'list_playlists') {
      const appleRes = await fetch('https://api.music.apple.com/v1/me/library/playlists?limit=100', {
        headers: appleHeaders,
      });
      const data = await appleRes.json().catch(() => ({}));
      if (!appleRes.ok) {
        const errText =
          typeof data === 'object' && data && 'errors' in data
            ? JSON.stringify((data as { errors: unknown }).errors)
            : `Apple API ${appleRes.status}`;
        return new Response(JSON.stringify({ error: errText }), {
          status: appleRes.status === 401 || appleRes.status === 403 ? appleRes.status : 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const items = (data.data ?? []) as Array<{
        id: string;
        attributes?: { name?: string };
      }>;
      const playlists = items.map((p) => ({
        id: p.id,
        name: p.attributes?.name ?? 'Playlist',
      }));
      return new Response(JSON.stringify({ playlists }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'add_to_playlist') {
      const playlist_id = body.playlist_id;
      const song_id = body.song_id;
      if (!playlist_id || typeof playlist_id !== 'string' || !song_id || typeof song_id !== 'string') {
        return new Response(JSON.stringify({ error: 'playlist_id and song_id required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const appleRes = await fetch(
        `https://api.music.apple.com/v1/me/library/playlists/${encodeURIComponent(playlist_id)}/tracks`,
        {
          method: 'POST',
          headers: {
            ...appleHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: [{ id: song_id, type: 'songs' }],
          }),
        },
      );
      if (appleRes.status === 201 || appleRes.status === 204) {
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errText = await appleRes.text();
      return new Response(JSON.stringify({ error: errText || `Apple API ${appleRes.status}` }), {
        status: appleRes.status === 401 || appleRes.status === 403 ? appleRes.status : 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action !== 'add_to_library') {
      return new Response(JSON.stringify({ error: 'unknown action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const song_id = body.song_id;
    if (!song_id || typeof song_id !== 'string') {
      return new Response(JSON.stringify({ error: 'song_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const appleRes = await fetch(`https://api.music.apple.com/v1/me/library?ids[songs]=${song_id}`, {
      method: 'POST',
      headers: appleHeaders,
    });

    if (appleRes.status === 202 || appleRes.status === 204) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const errText = await appleRes.text();
    return new Response(JSON.stringify({ error: errText || `Apple API ${appleRes.status}` }), {
      status: appleRes.status === 401 || appleRes.status === 403 ? appleRes.status : 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('apple-music-library error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
