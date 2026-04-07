import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, Search, Music } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import PromptInput from "@/components/PromptInput";
import SongCard from "@/components/SongCard";
import { examplePrompts, mockSongs } from "@/data/mockData";

const Landing = () => {
  const navigate = useNavigate();

  const handlePromptSubmit = (value: string) => {
    navigate(`/discover?q=${encodeURIComponent(value)}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <img
          src={heroBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card/50 text-muted-foreground text-sm font-body mb-8 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            AI-powered music discovery
          </div>

          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.1] mb-6 animate-fade-up">
            Find the song that means{" "}
            <span className="gradient-warm-text italic">what you mean.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground font-body max-w-xl mx-auto mb-10 animate-fade-up" style={{ animationDelay: "100ms" }}>
            Describe a feeling, a memory, or a thought. Echoes turns it into music.
          </p>

          <div className="max-w-2xl mx-auto mb-8 animate-fade-up" style={{ animationDelay: "200ms" }}>
            <PromptInput onSubmit={handlePromptSubmit} size="hero" />
          </div>

          <div className="flex flex-wrap justify-center gap-2 animate-fade-up" style={{ animationDelay: "300ms" }}>
            {examplePrompts.slice(0, 3).map((prompt) => (
              <button
                key={prompt}
                onClick={() => handlePromptSubmit(prompt)}
                className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all font-body"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-center mb-16">
            How <span className="gradient-warm-text">Echoes</span> works
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Sparkles, title: "Describe your feeling", desc: "Type anything — a memory, an emotion, a moment. No keywords needed." },
              { icon: Search, title: "AI interprets your intent", desc: "Echoes reads the emotional texture of your words and maps them to music." },
              { icon: Music, title: "Discover your songs", desc: "Get curated recommendations with deep explanations of why each song fits." },
            ].map((step, i) => (
              <div key={i} className="glass-card rounded-2xl p-6 text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preview results */}
      <section className="py-24 px-6 gradient-warm rounded-t-3xl">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-primary font-body mb-3 text-center">Preview</p>
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-center mb-4">
            Results that <span className="italic">mean</span> something
          </h2>
          <p className="text-muted-foreground text-center font-body mb-12 max-w-lg mx-auto">
            Every recommendation comes with context — not just metadata, but an understanding of why the song resonates.
          </p>

          <div className="space-y-4">
            {mockSongs.slice(0, 3).map((song, i) => (
              <SongCard key={song.id} {...song} index={i} />
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              to="/discover"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-body font-medium hover:opacity-90 transition-opacity"
            >
              Enter Echoes
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 text-center">
        <p className="font-display text-lg gradient-warm-text mb-2">Echoes</p>
        <p className="text-xs text-muted-foreground font-body">Music discovery, reimagined.</p>
      </footer>
    </div>
  );
};

export default Landing;
