import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      // PKCE flow: ?code= in query params
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        );
        if (!error) {
          navigate("/chat", { replace: true });
          return;
        }
      }

      // Implicit / Lovable cloud flow: #access_token= in hash
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const access_token = hashParams.get("access_token");
      const refresh_token = hashParams.get("refresh_token");

      if (access_token) {
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token: refresh_token ?? "",
        });
        if (!error) {
          navigate("/chat", { replace: true });
          return;
        }
      }

      // Let Supabase's detectSessionInUrl finish naturally and check
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/chat", { replace: true });
      } else {
        navigate("/auth", { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="animate-pulse text-muted-foreground">Completing login…</div>
    </div>
  );
};

export default AuthCallback;
