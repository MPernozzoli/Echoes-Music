import AppLayout from "@/components/AppLayout";
import { User, Music, Palette, LogOut, ExternalLink } from "lucide-react";

const Profile = () => {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 pb-20 md:pb-8">
        <h1 className="font-display text-3xl font-bold mb-8">Settings</h1>

        {/* User info */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold">Demo User</h2>
              <p className="text-sm text-muted-foreground font-body">demo@echoes.app</p>
            </div>
          </div>
        </div>

        {/* Spotify */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[hsl(141,73%,42%)]/10 flex items-center justify-center">
                <Music className="w-5 h-5 text-[hsl(141,73%,42%)]" />
              </div>
              <div>
                <h3 className="font-body text-sm font-medium text-foreground">Spotify</h3>
                <p className="text-xs text-muted-foreground font-body">Connect to save playlists</p>
              </div>
            </div>
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-sm font-body text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all">
              Connect
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Theme */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Palette className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-body text-sm font-medium text-foreground">Theme</h3>
                <p className="text-xs text-muted-foreground font-body">Visual appearance</p>
              </div>
            </div>
            <span className="text-sm text-muted-foreground font-body px-3 py-1 rounded-lg bg-muted">Dark</span>
          </div>
        </div>

        {/* Sign out */}
        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive font-body transition-colors mt-4">
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </AppLayout>
  );
};

export default Profile;
