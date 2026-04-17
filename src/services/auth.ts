import { lovable } from "@/integrations/lovable";

export async function startGoogleAuth(redirectPath = "/auth/callback") {
  return lovable.auth.signInWithOAuth("google", {
    redirect_uri: `${window.location.origin}${redirectPath}`,
  });
}
