import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Heart, Music, Brain } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

/**
 * Dedicated SEO landing targeting the keyword "music for emotions"
 * across en-GB, en-CA, en-AU, en-US markets. Copy is intentionally
 * English-only and keyword-rich; users click through to /chat to convert.
 */
const MusicForEmotions = () => {
  useEffect(() => {
    // Inject Article + FAQ JSON-LD scoped to this route.
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.dataset.echoesLanding = "music-for-emotions";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          "@id": "https://echoesmusic.it/music-for-emotions",
          name: "Music for emotions — find songs that match how you feel",
          description:
            "Echoes is an AI music journal that turns a feeling, memory or thought into songs that truly fit your emotion. Free to try, no signup needed.",
          inLanguage: "en",
        },
        {
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "How does Echoes pick music for my emotions?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "You describe what you feel — a mood, a memory, a thought, even a photo. Echoes' AI reads lyrics, vibe and context to suggest songs that match the emotion, not just the genre.",
              },
            },
            {
              "@type": "Question",
              name: "Is Echoes free to use?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes — you get free AI searches without signing up, and more after you create a free account. Premium plans unlock unlimited searches and library sync.",
              },
            },
            {
              "@type": "Question",
              name: "Does it work with Spotify and Apple Music?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Yes. Echoes plays previews instantly and lets you save tracks straight into your Spotify or Apple Music library.",
              },
            },
          ],
        },
      ],
    });
    document.head.appendChild(ld);
    return () => {
      ld.remove();
    };
  }, []);

  const pillars = [
    {
      icon: Brain,
      title: "Emotion-first, not genre-first",
      desc: "Most apps cluster by genre. Echoes starts from how you feel and works backwards to find songs whose lyrics, tempo and texture match that exact emotion.",
    },
    {
      icon: Sparkles,
      title: "AI that reads context",
      desc: "Describe a moment in your own words — 'driving home after a long day', 'missing someone I never met'. Echoes' AI understands nuance, not just keywords.",
    },
    {
      icon: Heart,
      title: "A music journal of your moods",
      desc: "Every search becomes part of a personal journal. Look back at what you felt and what you played — a map of your emotional year, in songs.",
    },
  ];

  const examples = [
    { mood: "Bittersweet nostalgia", song: "Songs that feel like an old photograph in summer light" },
    { mood: "Quiet focus", song: "Instrumental textures that hold attention without demanding it" },
    { mood: "Restless joy", song: "Tracks that match the buzz of a Friday afternoon before plans" },
    { mood: "Heavy heart", song: "Music that sits with grief instead of trying to fix it" },
  ];

  const faqs = [
    {
      q: "How does Echoes pick music for my emotions?",
      a: "You describe what you feel — a mood, a memory, a thought, even a photo. Echoes' AI reads lyrics, vibe and context to suggest songs that match the emotion, not just the genre.",
    },
    {
      q: "Is Echoes free to use?",
      a: "Yes — you get free AI searches without signing up, and more after you create a free account. Premium plans unlock unlimited searches and library sync.",
    },
    {
      q: "Does it work with Spotify and Apple Music?",
      a: "Yes. Echoes plays previews instantly and lets you save tracks straight into your Spotify or Apple Music library.",
    },
    {
      q: "What kind of emotions can I search for?",
      a: "Anything you can name — joy, longing, anxiety, hope, awe — and everything you can only describe. The more specific your words, the more precise the songs.",
    },
  ];

  return (
    <AppLayout headerVariant="marketing">
      <div className="min-h-screen bg-background">
        {/* HERO */}
        <section className="relative overflow-hidden py-20 md:py-28 px-6">
          <img
            src={heroBg}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-30"
            width={1920}
            height={1080}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
          <div className="relative z-10 max-w-3xl mx-auto text-center">
            <p className="text-xs uppercase tracking-widest text-primary font-body mb-4">
              AI music journal
            </p>
            <h1 className="font-display text-4xl md:text-6xl font-bold leading-[1.08] mb-6 text-balance">
              Music for <span className="gradient-warm-text italic">emotions</span> — find songs that match how you feel
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground font-body mb-8 max-w-2xl mx-auto leading-relaxed">
              Describe a feeling, a memory or a thought. Echoes turns it into songs that truly fit the emotion — not just the genre. Free to try, no signup needed.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="hero" size="lg" className="rounded-full px-7 gap-2 font-body" asChild>
                <Link to="/chat">
                  Try it free <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button variant="soft" size="lg" className="rounded-full px-7 font-body" asChild>
                <Link to="/pricing">See plans</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* WHY */}
        <section className="py-20 md:py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-center mb-14 text-balance">
              Why a different way of finding <span className="italic">emotional music</span>
            </h2>
            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
              {pillars.map((p) => (
                <div
                  key={p.title}
                  className="surface-elevated rounded-2xl p-7 border border-border/40 hover:border-primary/20 transition-colors"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-emotional-tag/10 ring-1 ring-primary/20 flex items-center justify-center mb-4">
                    <p.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-display text-lg font-semibold mb-2">{p.title}</h3>
                  <p className="text-sm text-muted-foreground font-body leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* EXAMPLES */}
        <section className="py-20 md:py-24 px-6 bg-muted/20 border-y border-border/40">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-center mb-4 text-balance">
              What music for emotions actually sounds like
            </h2>
            <p className="text-center text-muted-foreground font-body mb-12 max-w-2xl mx-auto">
              A few real prompts people have asked Echoes — and what comes back.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {examples.map((e) => (
                <div key={e.mood} className="rounded-2xl border border-border/40 bg-card/60 p-6">
                  <div className="flex items-start gap-3">
                    <Music className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-display text-base font-semibold mb-1">{e.mood}</p>
                      <p className="text-sm text-muted-foreground font-body leading-relaxed">{e.song}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20 md:py-24 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-center mb-12 text-balance">
              Common questions
            </h2>
            <div className="space-y-4">
              {faqs.map((f) => (
                <details
                  key={f.q}
                  className="rounded-2xl border border-border/40 bg-card/40 p-6 group"
                >
                  <summary className="cursor-pointer font-display text-base font-semibold list-none flex items-center justify-between gap-4">
                    {f.q}
                    <span className="text-primary transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground font-body leading-relaxed">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-6 relative overflow-hidden">
          <div className="absolute inset-0 gradient-warm opacity-60" aria-hidden />
          <div className="relative max-w-2xl mx-auto text-center">
            <h2 className="font-display text-3xl md:text-4xl font-semibold mb-5 text-balance">
              Find the song that says what you mean
            </h2>
            <p className="text-muted-foreground font-body mb-8">
              Free to try — no account needed for your first searches.
            </p>
            <Button variant="hero" size="lg" className="rounded-full px-8 gap-2 font-body" asChild>
              <Link to="/chat">
                Start a search <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default MusicForEmotions;
