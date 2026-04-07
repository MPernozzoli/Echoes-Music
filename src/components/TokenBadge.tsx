import { Coins } from "lucide-react";
import { useAuth } from "@/context/useAuth";

const TokenBadge = () => {
  const { tokenBalance, user } = useAuth();

  if (!user || tokenBalance === null) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary">
      <Coins className="h-3.5 w-3.5" />
      <span>{tokenBalance}</span>
    </div>
  );
};

export default TokenBadge;
