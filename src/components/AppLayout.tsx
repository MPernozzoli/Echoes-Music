import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MessageSquare, Clock, Heart, User, LogIn } from "lucide-react";
import { useAuth } from "@/context/useAuth";
import TokenBadge from "@/components/TokenBadge";
import { AppLogo } from "@/components/AppLogo";
import TokenLowBanner from "@/components/TokenLowBanner";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const location = useLocation();
  const { t } = useTranslation();
  const { user } = useAuth();

  const navItems = [
    { labelKey: "nav.chat", path: "/chat", icon: MessageSquare },
    { labelKey: "nav.history", path: "/history", icon: Clock },
    { labelKey: "nav.favorites", path: "/favorites", icon: Heart },
    { labelKey: "nav.profile", path: "/profile", icon: User },
  ] as const;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <AppLogo size={28} className="rounded-lg" />
            <span className="font-display text-lg font-semibold gradient-warm-text">Echoes</span>
          </Link>

          <div className="flex items-center gap-3">
            <TokenBadge />
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-body transition-colors ${
                      isActive
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {t(item.labelKey)}
                  </Link>
                );
              })}
            </nav>
            {!user && (
              <Link
                to="/auth"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden md:inline">Login</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <TokenLowBanner />

      <main className="flex-1">{children}</main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/90 backdrop-blur-xl">
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 text-xs font-body transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {t(item.labelKey)}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;
