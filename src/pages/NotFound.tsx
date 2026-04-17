import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Disc3 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <AppLayout>
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-16">
        <div className="surface-card rounded-3xl border border-border/50 p-10 md:p-14 text-center max-w-md shadow-elevated">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-emotional-tag/10 ring-1 ring-primary/20">
            <Disc3 className="h-10 w-10 text-primary animate-vinyl-spin motion-reduce:animate-none opacity-90" />
          </div>
          <p className="text-sm font-mono text-muted-foreground mb-2">404</p>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-3">{t("notFound.title")}</h1>
          <p className="text-sm text-muted-foreground font-body mb-8">{t("notFound.body")}</p>
          <Button variant="hero" className="rounded-full px-8" asChild>
            <Link to="/">{t("notFound.home")}</Link>
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default NotFound;
