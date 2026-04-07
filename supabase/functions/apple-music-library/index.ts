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
        : (body.song_id != null && body.song_id !== '' && body.music_user_token)
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
      const playlists: { id: string; name: string }[] = [];
      let nextUrl: string | null = 'https://api.music.apple.com/v1/me/library/playlists?limit=100';
      for (let page = 0; page < 30 && nextUrl; page++) {
        const appleRes: Response = await fetch(nextUrl, { headers: appleHeaders });
        const data: Record<string, unknown> = await appleRes.json().catch(() => ({}));
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
        for (const p of items) {
          playlists.push({ id: p.id, name: p.attributes?.name ?? 'Playlist' });
        }
        nextUrl = typeof data.next === 'string' ? data.next : null;
      }
      return new Response(JSON.stringify({ playlists }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'ensure_echoes_playlist') {
      const PLAYLIST_NAME = 'Echoes';
      let nextUrl: string | null = 'https://api.music.apple.com/v1/me/library/playlists?limit=100';
      for (let page = 0; page < 30 && nextUrl; page++) {
        const appleRes: Response = await fetch(nextUrl, { headers: appleHeaders });
        const data: Record<string, unknown> = await appleRes.json().catch(() => ({}));
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
        const found = items.find((p) => (p.attributes?.name ?? '').trim() === PLAYLIST_NAME);
        if (found) {
          return new Response(JSON.stringify({ playlist_id: found.id }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        nextUrl = typeof data.next === 'string' ? data.next : null;
      }

      const createRes = await fetch('https://api.music.apple.com/v1/me/library/playlists', {
        method: 'POST',
        headers: {
          ...appleHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attributes: { name: PLAYLIST_NAME, description: 'Preferiti sincronizzati da Echoes' },
        }),
      });
      const createdData = await createRes.json().catch(() => ({}));
      if (!createRes.ok) {
        const errText =
          typeof createdData === 'object' && createdData && 'errors' in createdData
            ? JSON.stringify((createdData as { errors: unknown }).errors)
            : `Apple API ${createRes.status}`;
        return new Response(JSON.stringify({ error: errText }), {
          status: createRes.status === 401 || createRes.status === 403 ? createRes.status : 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const raw = createdData.data as { id?: string } | { id?: string }[] | undefined;
      const pid = Array.isArray(raw) ? raw[0]?.id : raw?.id;
      if (!pid) {
        return new Response(JSON.stringify({ error: 'Apple: playlist create returned no id' }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ playlist_id: pid }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'sync_playlist_tracks') {
      const playlist_id = body.playlist_id;
      const catalog_song_ids = body.catalog_song_ids;
      if (!playlist_id || typeof playlist_id !== 'string' || !Array.isArray(catalog_song_ids)) {
        return new Response(JSON.stringify({ error: 'playlist_id and catalog_song_ids[] required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const desired = new Set(
        (catalog_song_ids as unknown[])
          .map((x) => String(x ?? '').trim())
          .filter(Boolean),
      );

      type PlTrack = { id: string; type: string; relationships?: { catalog?: { data?: { id: string; type: string }[] } } };

      const resolveCatalogId = (t: PlTrack): string | undefined => {
        if (t.type === 'songs') return t.id;
        const rel = t.relationships?.catalog?.data?.[0];
        if (rel?.type === 'songs' && rel.id) return rel.id;
        return undefined;
      };

      const inPlaylist = new Map<string, { id: string; type: string }>();
      let tracksUrl: string | null =
        `https://api.music.apple.com/v1/me/library/playlists/${encodeURIComponent(playlist_id)}/tracks?include=catalog&limit=100`;

      for (let page = 0; page < 50 && tracksUrl; page++) {
        const trRes: Response = await fetch(tracksUrl, { headers: appleHeaders });
        const trData: Record<string, unknown> = await trRes.json().catch(() => ({}));
        if (!trRes.ok) {
          const errText =
            typeof trData === 'object' && trData && 'errors' in trData
              ? JSON.stringify((trData as { errors: unknown }).errors)
              : `Apple API ${trRes.status}`;
          return new Response(JSON.stringify({ error: errText }), {
            status: trRes.status === 401 || trRes.status === 403 ? trRes.status : 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const rows = (trData.data ?? []) as PlTrack[];
        for (const t of rows) {
          const cat = resolveCatalogId(t);
          if (cat) inPlaylist.set(cat, { id: t.id, type: t.type });
        }
        tracksUrl = typeof trData.next === 'string' ? trData.next : null;
      }

      const toRemove: { catId: string; ref: { id: string; type: string } }[] = [];
      for (const [catId, ref] of inPlaylist) {
        if (!desired.has(catId)) toRemove.push({ catId, ref });
      }
      const BATCH = 25;
      for (let i = 0; i < toRemove.length; i += BATCH) {
        const chunk = toRemove.slice(i, i + BATCH);
        const delRes = await fetch(
          `https://api.music.apple.com/v1/me/library/playlists/${encodeURIComponent(playlist_id)}/tracks`,
          {
            method: 'DELETE',
            headers: {
              ...appleHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data: chunk.map((c) => ({ id: c.ref.id, type: c.ref.type })) }),
          },
        );
        if (!delRes.ok && delRes.status !== 204) {
          const errText = await delRes.text();
          return new Response(JSON.stringify({ error: errText || `Apple delete tracks ${delRes.status}` }), {
            status: delRes.status === 401 || delRes.status === 403 ? delRes.status : 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        for (const c of chunk) inPlaylist.delete(c.catId);
      }

      const toAdd: string[] = [];
      for (const id of desired) {
        if (!inPlaylist.has(id)) toAdd.push(id);
      }
      for (let i = 0; i < toAdd.length; i += BATCH) {
        const chunk = toAdd.slice(i, i + BATCH);
        const addRes = await fetch(
          `https://api.music.apple.com/v1/me/library/playlists/${encodeURIComponent(playlist_id)}/tracks`,
          {
            method: 'POST',
            headers: {
              ...appleHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              data: chunk.map((songId) => ({ id: songId, type: 'songs' })),
            }),
          },
        );
        if (addRes.status !== 201 && addRes.status !== 204) {
          const errText = await addRes.text();
          return new Response(JSON.stringify({ error: errText || `Apple add tracks ${addRes.status}` }), {
            status: addRes.status === 401 || addRes.status === 403 ? addRes.status : 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'add_to_playlist') {
      const playlist_id = body.playlist_id;
      const song_id = body.song_id != null ? String(body.song_id) : '';
      if (!playlist_id || typeof playlist_id !== 'string' || !song_id) {
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

    const song_id = body.song_id != null ? String(body.song_id) : '';
    if (!song_id) {
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
