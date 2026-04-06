import type { EmotionalProfile as EmotionalProfileType } from "@/data/mockData";

interface EmotionalProfileProps {
  profile: EmotionalProfileType;
}

const profileFields: { key: keyof EmotionalProfileType; label: string }[] = [
  { key: "mood", label: "Mood" },
  { key: "energy", label: "Energy" },
  { key: "intimacy", label: "Intimacy" },
  { key: "catharsis", label: "Catharsis" },
  { key: "emotionalTension", label: "Tension" },
];

const EmotionalProfileCard = ({ profile }: EmotionalProfileProps) => {
  return (
    <div className="glass-card rounded-2xl p-6 animate-fade-in">
      <h3 className="font-display text-base font-semibold text-foreground mb-4">Emotional Profile</h3>

      <div className="flex flex-wrap gap-2 mb-5">
        {profile.themes.map((theme) => (
          <span
            key={theme}
            className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-body"
          >
            {theme}
          </span>
        ))}
      </div>

      <div className="space-y-3">
        {profileFields.map(({ key, label }) => (
          <div key={key} className="flex items-start gap-3">
            <span className="text-xs text-muted-foreground w-16 shrink-0 pt-0.5 font-body uppercase tracking-wider">
              {label}
            </span>
            <span className="text-sm text-secondary-foreground/80 font-body">
              {typeof profile[key] === "string" ? profile[key] : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmotionalProfileCard;
