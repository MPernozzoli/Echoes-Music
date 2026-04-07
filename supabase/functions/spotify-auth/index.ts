import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_ME_URL = 'https://api.spotify.com/v1/me';

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
    const { action, code, redirect_uri, session_id } = await req.json();

    // --- GET AUTH URL ---
    if (action === 'get_auth_url') {
      const scopes = 'streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state';
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

      // Get user profile
      const meRes = await fetch(SPOTIFY_ME_URL, {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` },
      });
      const me = await meRes.json();

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      // Upsert connection
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
      const { data: conn, error } = await supabase
        .from('spotify_connections')
        .select('*')
        .eq('anonymous_session_id', session_id)
        .maybeSingle();

      if (error || !conn) {
        return new Response(JSON.stringify({ error: 'No Spotify connection found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if token is expired
      if (new Date(conn.token_expires_at) < new Date()) {
        // Refresh
        const refreshRes = await fetch(SPOTIFY_TOKEN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
          },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: conn.refresh_token,
          }),
        });

        if (!refreshRes.ok) {
          return new Response(JSON.stringify({ error: 'Token refresh failed' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
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
          .eq('id', conn.id);

        return new Response(JSON.stringify({
          access_token: refreshed.access_token,
          product: conn.product,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        access_token: conn.access_token,
        product: conn.product,
      }), {
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
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
