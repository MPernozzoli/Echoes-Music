import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_ME_URL = 'https://api.spotify.com/v1/me';
const SPOTIFY_API = 'https://api.spotify.com/v1';

type SpotifyConn = {
  id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  product: string | null;
};

async function getValidAccessToken(
  supabase: any,
  session_id: string,
  clientId: string,
  clientSecret: string,
): Promise<{ access_token: string; product: string | null } | { error: string; status: number }> {
  const { data: conn, error } = await supabase
    .from('spotify_connections')
    .select('*')
    .eq('anonymous_session_id', session_id)
    .maybeSingle();

  if (error || !conn) {
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

    // --- GET AUTH URL ---
    if (action === 'get_auth_url') {
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
        redirect_uri: redirect_uri,
        state: session_id || 'anonymous',
        show_dialog: 'true',
      });
      return new Response(JSON.stringify({ url: `https://accounts.spotify.com/authorize?${params}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- EXCHANGE CODE ---
    if (action === 'exchange_code') {
      const tokenRes = await fetch(SPOTIFY_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri,
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
      const me = await meRes.json();

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      const { error: dbError } = await supabase
        .from('spotify_connections')
        .upsert({
          anonymous_session_id: session_id,
          spotify_user_id: me.id,
          display_name: me.display_name,
          product: me.product,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt,
        }, { onConflict: 'anonymous_session_id' });

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
      const auth = await getValidAccessToken(supabase, session_id, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET);
      if ('error' in auth) {
        return new Response(JSON.stringify({ error: auth.error }), {
          status: auth.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({
        access_token: auth.access_token,
        product: auth.product,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- SAVE TRACKS (library) ---
    if (action === 'save_tracks') {
      const track_ids: string[] = body.track_ids;
      if (!session_id || !Array.isArray(track_ids) || track_ids.length === 0) {
        return new Response(JSON.stringify({ error: 'session_id and track_ids required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const auth = await getValidAccessToken(supabase, session_id, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET);
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
      if (!session_id) {
        return new Response(JSON.stringify({ error: 'session_id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const auth = await getValidAccessToken(supabase, session_id, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET);
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

    // --- ADD TO PLAYLIST ---
    if (action === 'add_to_playlist') {
      const { playlist_id, track_id } = body;
      if (!session_id || !playlist_id || !track_id) {
        return new Response(JSON.stringify({ error: 'session_id, playlist_id and track_id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const auth = await getValidAccessToken(supabase, session_id, SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET);
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
      await supabase
        .from('spotify_connections')
        .delete()
        .eq('anonymous_session_id', session_id);

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
