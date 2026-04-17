import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MessageSquare, Clock, Heart, User, LogIn } from "lucide-react";
import { useAuth } from "@/context/useAuth";
import TokenBadge from "@/components/TokenBadge";
import { AppLogo } from "@/components/AppLogo";
import { GlobalPlaybackDock } from "@/components/GlobalPlaybackDock";
import TokenLowBanner from "@/components/TokenLowBanner";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppLayoutProps {
  children: React.ReactNode;
  /** Home / landing: solo logo e azioni account, senza nav principale né dock mobile */
  headerVariant?: "app" | "marketing";
}

const AppLayout = ({ children, headerVariant = "app" }: AppLayoutProps) => {
  const location = useLocation();
  const { t } = useTranslation();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const navItems = [
    { labelKey: "nav.chat", path: "/chat", icon: MessageSquare },
    { labelKey: "nav.history", path: "/history", icon: Clock },
    { labelKey: "nav.favorites", path: "/favorites", icon: Heart },
    { labelKey: "nav.profile", path: "/profile", icon: User },
  ] as const;

  const isMarketing = headerVariant === "marketing";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b border-borderSubtle/70 bg-background/90 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/75 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="group flex items-center gap-2 rounded-xl pr-1 -ml-1 pl-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ringGlow focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none">
            <AppLogo size={28} className="rounded-lg transition-transform duration-300 motion-reduce:transition-none group-hover:scale-[1.04] group-active:scale-[0.98]" />
            <span className="font-display text-lg font-semibold gradient-warm-text transition-[opacity,filter] duration-300 motion-reduce:transition-none group-hover:opacity-95 group-hover:brightness-110">Echoes</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <TokenBadge />
            {!isMarketing && (
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-body transition-all ${
                        isActive
                          ? "text-primary bg-primary/12 shadow-sm ring-1 ring-primary/15"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      {t(item.labelKey)}
                    </Link>
                  );
                })}
              </nav>
            )}
            {isMarketing ? (
              user ? (
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-body font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  <User className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">{t("nav.profile")}</span>
                </Link>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Link
                    to="/auth"
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-sm font-body font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <LogIn className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">{t("nav.login")}</span>
                  </Link>
                  <Button size="sm" className="rounded-lg font-body" asChild>
                    <Link to="/auth">{t("nav.signUp")}</Link>
                  </Button>
                </div>
              )
            ) : (
              !user && (
                <Link
                  to="/auth"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden md:inline">{t("nav.login")}</span>
                </Link>
              )
            )}
          </div>
        </div>
      </header>

      <TokenLowBanner />

      <main
        className="flex-1"
        style={
          isMarketing
            ? undefined
            : { paddingBottom: `var(--global-player-offset, ${isMobile ? "56px" : "0px"})` }
        }
      >
        {children}
      </main>

      {!isMarketing && (
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-borderSubtle/80 bg-background/95 backdrop-blur-2xl pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.12)]">
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex flex-col items-center gap-0.5 text-[11px] font-body transition-colors px-3 py-1.5 rounded-2xl ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {isActive ? (
                  <span className="absolute inset-x-1 -inset-y-0.5 rounded-2xl bg-primary/10 ring-1 ring-primary/15 -z-10" aria-hidden />
                ) : null}
                <item.icon className="w-5 h-5" />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </div>
      </nav>
      )}

      {!isMarketing && <GlobalPlaybackDock />}
    </div>
  );
};

export default AppLayout;
