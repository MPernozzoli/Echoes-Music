import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { exchangeSpotifyCode } from "@/services/spotify";
import { useSpotify } from "@/context/SpotifyContext";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

const SpotifyCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useSpotify();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const err = searchParams.get("error");

    if (err) {
      setStatus("error");
      setError(err === "access_denied" ? "Access denied" : err);
      setTimeout(() => navigate("/profile"), 2000);
      return;
    }

    if (!code) {
      setStatus("error");
      setError("No authorization code received");
      setTimeout(() => navigate("/profile"), 2000);
      return;
    }

    const redirectUri = `${window.location.origin}/spotify-callback`;

    exchangeSpotifyCode(code, redirectUri).then(async (data) => {
      if (data.error) {
        setStatus("error");
        setError(data.error);
        setTimeout(() => navigate("/profile"), 3000);
      } else {
        setStatus("success");
        await refresh();
        setTimeout(() => navigate("/profile"), 1500);
      }
    }).catch(() => {
      setStatus("error");
      setError("Connection failed");
      setTimeout(() => navigate("/profile"), 3000);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- esegui una sola volta al caricamento con ?code=
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="glass-card rounded-2xl p-8 text-center max-w-sm mx-auto">
        {status === "loading" && (
          <>
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
            <p className="font-body text-foreground">Connecting Spotify…</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="w-8 h-8 text-primary mx-auto mb-4" />
            <p className="font-body text-foreground">Connected! Redirecting…</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="w-8 h-8 text-destructive mx-auto mb-4" />
            <p className="font-body text-foreground mb-1">Something went wrong</p>
            <p className="text-xs text-muted-foreground font-body">{error}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default SpotifyCallback;
