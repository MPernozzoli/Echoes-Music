import { useEffect, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/useAuth";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Crown, X, Search } from "lucide-react";

interface AdminUserRow {
  user_id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  plan: string;
  status: string;
  current_period_end: string | null;
  is_admin: boolean;
}

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setIsAdmin(false); return; }
    (async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setIsAdmin(Boolean(data));
    })();
  }, [user, authLoading]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_users");
    if (error) {
      toast.error("Errore nel caricamento utenti", { description: error.message });
      setUsers([]);
    } else {
      setUsers((data ?? []) as AdminUserRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) void loadUsers();
  }, [isAdmin, loadUsers]);

  const grantPro = async (userId: string) => {
    setBusyId(userId);
    const { error } = await supabase.rpc("admin_grant_pro", { p_user_id: userId, p_years: 100 });
    if (error) toast.error("Errore", { description: error.message });
    else { toast.success("PRO attivato"); await loadUsers(); }
    setBusyId(null);
  };

  const revokePro = async (userId: string) => {
    setBusyId(userId);
    const { error } = await supabase.rpc("admin_revoke_pro", { p_user_id: userId });
    if (error) toast.error("Errore", { description: error.message });
    else { toast.success("PRO revocato"); await loadUsers(); }
    setBusyId(null);
  };

  if (authLoading || isAdmin === null) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const filtered = users.filter((u) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (u.email ?? "").toLowerCase().includes(q) || (u.display_name ?? "").toLowerCase().includes(q);
  });

  const proCount = users.filter((u) => u.plan === "premium" && u.status === "active").length;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-6">
        <header className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-3xl font-semibold flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-primary" /> Admin
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {users.length} utenti · {proCount} PRO attivi
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca per email o nome…"
              className="pl-9"
            />
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-xl border border-borderSubtle overflow-hidden bg-card/40">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-3">Utente</th>
                    <th className="text-left px-4 py-3">Stato</th>
                    <th className="text-left px-4 py-3 hidden md:table-cell">Scadenza</th>
                    <th className="text-right px-4 py-3">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => {
                    const isPro = u.plan === "premium" && u.status === "active";
                    return (
                      <tr key={u.user_id} className="border-t border-borderSubtle/60 hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <div className="font-medium flex items-center gap-2">
                            {u.email ?? "—"}
                            {u.is_admin && (
                              <Badge variant="secondary" className="text-[10px]">ADMIN</Badge>
                            )}
                          </div>
                          {u.display_name && (
                            <div className="text-xs text-muted-foreground">{u.display_name}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isPro ? (
                            <Badge className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/20 border-amber-500/30">
                              <Crown className="w-3 h-3 mr-1" /> PRO
                            </Badge>
                          ) : (
                            <Badge variant="outline">Free</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                          {u.current_period_end
                            ? new Date(u.current_period_end).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isPro ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busyId === u.user_id}
                              onClick={() => revokePro(u.user_id)}
                            >
                              {busyId === u.user_id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <><X className="w-4 h-4 mr-1" /> Revoca</>
                              )}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              disabled={busyId === u.user_id}
                              onClick={() => grantPro(u.user_id)}
                            >
                              {busyId === u.user_id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <><Crown className="w-4 h-4 mr-1" /> Attiva PRO</>
                              )}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">Nessun utente trovato.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Admin;
