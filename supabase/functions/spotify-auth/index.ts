import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_ME_URL = 'https://api.spotify.com/v1/me';
const SPOTIFY_API = 'https://api.spotify.com/v1';

function resolveSpotifyRedirectUri(requestRedirectUri: unknown): string | null {
  const configuredRedirectUri = Deno.env.get('SPOTIFY_REDIRECT_URI')?.trim();
  if (configuredRedirectUri) return configuredRedirectUri;
  if (typeof requestRedirectUri !== 'string') return null;
  const redirectUri = requestRedirectUri.trim();
  return redirectUri || null;
}

type SpotifyConn = {
  id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  product: string | null;
};

async function getUserIdFromJwt(authHeader: string | null, supabase: any): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const jwt = authHeader.slice(7).trim();
  if (!jwt) return null;
  const { data: { user }, error } = await supabase.auth.getUser(jwt);
  if (error || !user) return null;
  return user.id;
}

async function resolveSpotifyConnection(
  supabase: any,
  session_id: string | undefined,
  userId: string | null,
): Promise<SpotifyConn | null> {
  if (userId) {
    const { data } = await supabase
      .from('spotify_connections')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) return data as SpotifyConn;
  }
  if (session_id) {
    const { data } = await supabase
      .from('spotify_connections')
      .select('*')
      .eq('anonymous_session_id', session_id)
      .maybeSingle();
    if (data) return data as SpotifyConn;
  }
  return null;
}

async function getValidAccessToken(
  supabase: any,
  session_id: string | undefined,
  userId: string | null,
  clientId: string,
  clientSecret: string,
): Promise<{ access_token: string; product: string | null } | { error: string; status: number }> {
  const conn = await resolveSpotifyConnection(supabase, session_id, userId);

  if (!conn) {
    return { error: 'No Spotify connection found', status: 404 };
  }

  const row = conn as SpotifyConn;

  if (new Date(row.token_expires_at) < new Date()) {
    const refreshRes = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: row.refresh_token,
      }),
    });

    if (!refreshRes.ok) {
      return { error: 'Token refresh failed', status: 400 };
    }

    const refreshed = await refreshRes.json();
    const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

    await supabase
      .from('spotify_connections')
      .update({
        access_token: refreshed.access_token,
        token_expires_at: newExpiry,
        ...(refreshed.refresh_token ? { refresh_token: refreshed.refresh_token } : {}),
      })
      .eq('id', row.id);

    return { access_token: refreshed.access_token, product: row.product };
  }

  return { access_token: row.access_token, product: row.product };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const SPOTIFY_CLIENT_ID = Deno.env.get('SPOTIFY_CLIENT_ID');
  const SPOTIFY_CLIENT_SECRET = Deno.env.get('SPOTIFY_CLIENT_SECRET');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    return new Response(JSON.stringify({ error: 'Spotify credentials not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Supabase credentials not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const body = await req.json();
    const { action, code, redirect_uri, session_id } = body;
    const spotifyRedirectUri = resolveSpotifyRedirectUri(redirect_uri);
    const userId = await getUserIdFromJwt(req.headers.get('Authorization'), supabase);

    // --- GET AUTH URL ---
    if (action === 'get_auth_url') {
      if (!userId) {
        return new Response(JSON.stringify({ error: 'Login required to connect Spotify' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!spotifyRedirectUri) {
        return new Response(JSON.stringify({ error: 'Spotify redirect URI not configured' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const scopes = [
        'streaming',
        'user-read-email',
        'user-read-private',
        'user-read-playback-state',
        'user-modify-playback-state',
        'user-library-modify',
        'playlist-read-private',
        'playlist-modify-private',
        'playlist-modify-public',
      ].join(' ');

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: SPOTIFY_CLIENT_ID,
        scope: scopes,
        redirect_uri: spotifyRedirectUri,
        state: session_id || 'anonymous',
        show_dialog: 'true',
      });
      return new Response(JSON.stringify({ url: `https://accounts.spotify.com/authorize?${params}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- EXCHANGE CODE ---
    if (action === 'exchange_code') {
      if (!userId) {
        return new Response(JSON.stringify({ error: 'Login required to connect Spotify' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!spotifyRedirectUri) {
        return new Response(JSON.stringify({ error: 'Spotify redirect URI not configured' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const tokenRes = await fetch(SPOTIFY_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: spotifyRedirectUri,
        }),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        return new Response(JSON.stringify({ error: `Token exchange failed: ${err}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const tokens = await tokenRes.json();

      const meRes = await fetch(SPOTIFY_ME_URL, {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` },
      });
      if (!meRes.ok) {
        const raw = await meRes.text();
        // L'app Spotify in Development Mode rifiuta gli utenti non in allowlist con un testo
        // tipo "User not registered in the Developer Dashboard". Lo intercettiamo per dare
        // un messaggio chiaro al client invece di farlo crashare su un res.json() non-JSON.
        const notAllowlisted = /not registered/i.test(raw) || meRes.status === 403;
        const userMessage = notAllowlisted
          ? "Spotify non autorizza ancora questo account: aggiungilo all'allowlist della tua app Spotify (Development Mode), oppure richiedi l'Extended Quota."
          : `Spotify /me failed (${meRes.status}): ${raw.slice(0, 200)}`;
        return new Response(JSON.stringify({ error: userMessage }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      let me: { id?: string; display_name?: string; product?: string };
      try {
        me = await meRes.json();
      } catch {
        return new Response(JSON.stringify({ error: 'Risposta /me non valida da Spotify' }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (!me.id) {
        return new Response(JSON.stringify({ error: 'Profilo Spotify senza id utente' }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      const rowPayload = {
        spotify_user_id: me.id as string,
        display_name: me.display_name,
        product: me.product,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        anonymous_session_id: session_id ?? null,
        ...(userId ? { user_id: userId } : {}),
      };

      let dbError: { message: string } | null = null;
      const { data: existingUserRow } = await supabase
        .from('spotify_connections')
        .select('id')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existingUserRow?.id) {
        const { error } = await supabase.from('spotify_connections').update(rowPayload).eq('id', existingUserRow.id);
        dbError = error;
      } else {
        const { error } = await supabase
          .from('spotify_connections')
          .upsert(
            {
              anonymous_session_id: session_id,
              spotify_user_id: me.id,
              display_name: me.display_name,
              product: me.product,
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
              token_expires_at: expiresAt,
              user_id: userId,
            },
            { onConflict: 'anonymous_session_id' },
          );
        dbError = error;
      }

      if (dbError) {
        return new Response(JSON.stringify({ error: `DB error: ${dbError.message}` }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        spotify_user_id: me.id,
        display_name: me.display_name,
        product: me.product,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- GET PLAYBACK TOKEN ---
    if (action === 'get_token') {
      const auth = await getValidAccessToken(supabase, session_id, userId, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET);
      if ('error' in auth) {
        return new Response(JSON.stringify({ error: auth.error }), {
          status: auth.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Riallinea il `product` con il valore live di Spotify: se l'utente fa upgrade a Premium dopo
      // il primo collegamento, il DB resta "free" e il client cadrebbe su preview 30s. Best-effort.
      let liveProduct = auth.product;
      try {
        const meRes = await fetch('https://api.spotify.com/v1/me', {
          headers: { Authorization: `Bearer ${auth.access_token}` },
        });
        if (meRes.ok) {
          const me = await meRes.json();
          if (me?.product && me.product !== auth.product) {
            liveProduct = me.product;
            const conn = await resolveSpotifyConnection(supabase, session_id, userId);
            if (conn) {
              await supabase
                .from('spotify_connections')
                .update({ product: me.product })
                .eq('id', (conn as SpotifyConn).id);
            }
          }
        }
      } catch {
        /* ignora: torniamo comunque l'access token */
      }
      return new Response(JSON.stringify({
        access_token: auth.access_token,
        product: liveProduct,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- SAVE TRACKS (library) ---
    if (action === 'save_tracks') {
      const track_ids: string[] = body.track_ids;
      if ((!session_id && !userId) || !Array.isArray(track_ids) || track_ids.length === 0) {
        return new Response(JSON.stringify({ error: 'session_id or auth, and track_ids required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const auth = await getValidAccessToken(supabase, session_id, userId, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET);
      if ('error' in auth) {
        return new Response(JSON.stringify({ error: auth.error }), {
          status: auth.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const res = await fetch(`${SPOTIFY_API}/me/tracks`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${auth.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: track_ids.slice(0, 50) }),
      });

      if (!res.ok) {
        const t = await res.text();
        return new Response(JSON.stringify({ error: t || `Spotify ${res.status}` }), {
          status: res.status === 401 || res.status === 403 ? res.status : 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- LIST PLAYLISTS ---
    if (action === 'list_playlists') {
      if (!session_id && !userId) {
        return new Response(JSON.stringify({ error: 'session_id or auth required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const auth = await getValidAccessToken(supabase, session_id, userId, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET);
      if ('error' in auth) {
        return new Response(JSON.stringify({ error: auth.error }), {
          status: auth.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const res = await fetch(`${SPOTIFY_API}/me/playlists?limit=50`, {
        headers: { Authorization: `Bearer ${auth.access_token}` },
      });

      if (!res.ok) {
        const t = await res.text();
        return new Response(JSON.stringify({ error: t || `Spotify ${res.status}` }), {
          status: res.status === 401 || res.status === 403 ? res.status : 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await res.json();
      const playlists = (data.items ?? []).map((p: { id: string; name: string }) => ({
        id: p.id,
        name: p.name,
      }));

      return new Response(JSON.stringify({ playlists }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- ENSURE "ECHOES" PLAYLIST (find by name or create) ---
    if (action === 'ensure_echoes_playlist') {
      if (!session_id && !userId) {
        return new Response(JSON.stringify({ error: 'session_id or auth required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const auth = await getValidAccessToken(supabase, session_id, userId, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET);
      if ('error' in auth) {
        return new Response(JSON.stringify({ error: auth.error }), {
          status: auth.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const PLAYLIST_NAME = 'Echoes';
      let url: string | null = `${SPOTIFY_API}/me/playlists?limit=50`;
      while (url) {
        const res: Response = await fetch(url, {
          headers: { Authorization: `Bearer ${auth.access_token}` },
        });
        if (!res.ok) {
          const t = await res.text();
          return new Response(JSON.stringify({ error: t || `Spotify ${res.status}` }), {
            status: res.status === 401 || res.status === 403 ? res.status : 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const data: Record<string, unknown> = await res.json();
        const items = (data.items ?? []) as { id: string; name: string }[];
        const found = items.find((p) => p.name === PLAYLIST_NAME);
        if (found) {
          return new Response(JSON.stringify({ playlist_id: found.id }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        url = data.next ?? null;
      }

      const meRes = await fetch(SPOTIFY_ME_URL, {
        headers: { Authorization: `Bearer ${auth.access_token}` },
      });
      if (!meRes.ok) {
        const t = await meRes.text();
        return new Response(JSON.stringify({ error: t || 'Spotify me failed' }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const me = await meRes.json();
      const userId = me.id;
      if (!userId) {
        return new Response(JSON.stringify({ error: 'Spotify user id missing' }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const createRes = await fetch(`${SPOTIFY_API}/users/${encodeURIComponent(userId)}/playlists`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: PLAYLIST_NAME,
          public: false,
          description: 'Preferiti sincronizzati da Echoes',
        }),
      });
      if (!createRes.ok) {
        const t = await createRes.text();
        return new Response(JSON.stringify({ error: t || `Spotify ${createRes.status}` }), {
          status: createRes.status === 401 || createRes.status === 403 ? createRes.status : 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const created = await createRes.json();
      const pid = created.id;
      if (!pid) {
        return new Response(JSON.stringify({ error: 'Playlist create: no id' }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ playlist_id: pid }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- REPLACE PLAYLIST TRACKS (full mirror; track_ids = Spotify track ids without prefix) ---
    if (action === 'replace_playlist_tracks') {
      const { playlist_id, track_ids } = body;
      if ((!session_id && !userId) || !playlist_id || !Array.isArray(track_ids)) {
        return new Response(JSON.stringify({ error: 'session_id or auth, playlist_id and track_ids[] required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const auth = await getValidAccessToken(supabase, session_id, userId, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET);
      if ('error' in auth) {
        return new Response(JSON.stringify({ error: auth.error }), {
          status: auth.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const toUris = (ids: string[]) =>
        ids.map((id) => {
          const s = String(id).trim();
          if (!s) return '';
          return s.startsWith('spotify:') ? s : `spotify:track:${s}`;
        }).filter(Boolean);

      const uris = toUris(track_ids as string[]);

      const clearPlaylist = async () => {
        for (;;) {
          const res = await fetch(
            `${SPOTIFY_API}/playlists/${playlist_id}/tracks?limit=100&fields=items(track(uri)),next`,
            { headers: { Authorization: `Bearer ${auth.access_token}` } },
          );
          if (!res.ok) {
            const t = await res.text();
            throw new Error(t || `Spotify ${res.status}`);
          }
          const page = await res.json();
          const items = (page.items ?? []) as { track: { uri: string } | null }[];
          const tracks = items
            .filter((i) => i.track?.uri)
            .map((i) => ({ uri: i.track!.uri }));
          if (tracks.length === 0) break;
          const delRes = await fetch(`${SPOTIFY_API}/playlists/${playlist_id}/tracks`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${auth.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tracks }),
          });
          if (!delRes.ok) {
            const t = await delRes.text();
            throw new Error(t || `Spotify ${delRes.status}`);
          }
        }
      };

      try {
        if (uris.length === 0) {
          await clearPlaylist();
        } else {
          const first = uris.slice(0, 100);
          const putRes = await fetch(`${SPOTIFY_API}/playlists/${playlist_id}/tracks`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${auth.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ uris: first }),
          });
          if (!putRes.ok) {
            const t = await putRes.text();
            return new Response(JSON.stringify({ error: t || `Spotify ${putRes.status}` }), {
              status: putRes.status === 401 || putRes.status === 403 ? putRes.status : 502,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          for (let i = 100; i < uris.length; i += 100) {
            const chunk = uris.slice(i, i + 100);
            const postRes = await fetch(`${SPOTIFY_API}/playlists/${playlist_id}/tracks`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${auth.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ uris: chunk }),
            });
            if (!postRes.ok) {
              const t = await postRes.text();
              return new Response(JSON.stringify({ error: t || `Spotify ${postRes.status}` }), {
                status: postRes.status === 401 || postRes.status === 403 ? postRes.status : 502,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
          }
        }
      } catch (e) {
        return new Response(JSON.stringify({ error: (e as Error).message }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- ADD TO PLAYLIST ---
    if (action === 'add_to_playlist') {
      const { playlist_id, track_id } = body;
      if ((!session_id && !userId) || !playlist_id || !track_id) {
        return new Response(JSON.stringify({ error: 'session_id or auth, playlist_id and track_id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const auth = await getValidAccessToken(supabase, session_id, userId, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET);
      if ('error' in auth) {
        return new Response(JSON.stringify({ error: auth.error }), {
          status: auth.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const uri = track_id.startsWith('spotify:') ? track_id : `spotify:track:${track_id}`;
      const res = await fetch(`${SPOTIFY_API}/playlists/${playlist_id}/tracks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uris: [uri] }),
      });

      if (!res.ok) {
        const t = await res.text();
        return new Response(JSON.stringify({ error: t || `Spotify ${res.status}` }), {
          status: res.status === 401 || res.status === 403 ? res.status : 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- DISCONNECT ---
    if (action === 'disconnect') {
      if (userId) {
        await supabase.from('spotify_connections').delete().eq('user_id', userId);
      } else if (session_id) {
        await supabase.from('spotify_connections').delete().eq('anonymous_session_id', session_id);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('spotify-auth error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
