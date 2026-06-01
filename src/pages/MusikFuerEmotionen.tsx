import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Heart, Music, Brain } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

/**
 * German SEO landing targeting "musik für emotionen" / "musik für gefühle"
 * across de-DE, de-AT, de-CH. Mirrors MusicForEmotions structure with
 * native German copy and a German FAQPage JSON-LD block.
 */
const MusikFuerEmotionen = () => {
  useEffect(() => {
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.dataset.echoesLanding = "musik-fuer-emotionen";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebPage",
          "@id": "https://echoesmusic.it/musik-fuer-emotionen",
          name: "Musik für Emotionen — finde Songs, die zu deinem Gefühl passen",
          description:
            "Echoes ist ein KI-Musiktagebuch, das ein Gefühl, eine Erinnerung oder einen Gedanken in passende Songs verwandelt. Kostenlos testen, ohne Anmeldung.",
          inLanguage: "de",
        },
        {
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Wie wählt Echoes Musik für meine Emotionen aus?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Du beschreibst, was du fühlst — eine Stimmung, eine Erinnerung, einen Gedanken oder sogar ein Foto. Die KI von Echoes liest Lyrics, Klangtextur und Kontext, um Songs zu finden, die zum Gefühl passen, nicht nur zum Genre.",
              },
            },
            {
              "@type": "Question",
              name: "Ist Echoes kostenlos?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Ja — du erhältst kostenlose KI-Suchen ohne Anmeldung und mehr nach der Erstellung eines kostenlosen Kontos. Premium-Tarife schalten unbegrenzte Suchen und Bibliothekssynchronisation frei.",
              },
            },
            {
              "@type": "Question",
              name: "Funktioniert es mit Spotify und Apple Music?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Ja. Echoes spielt sofort Vorschauen ab und speichert Tracks direkt in deine Spotify- oder Apple-Music-Bibliothek.",
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
      title: "Gefühl zuerst, nicht Genre",
      desc: "Die meisten Apps gruppieren nach Genre. Echoes startet bei deinem Gefühl und sucht rückwärts nach Songs, deren Lyrics, Tempo und Textur genau dazu passen.",
    },
    {
      icon: Sparkles,
      title: "KI, die Kontext versteht",
      desc: "Beschreibe einen Moment mit deinen eigenen Worten — 'Heimfahrt nach einem langen Tag', 'jemanden vermissen, den ich nie kannte'. Echoes' KI versteht Nuancen, nicht nur Schlagworte.",
    },
    {
      icon: Heart,
      title: "Ein Musiktagebuch deiner Stimmungen",
      desc: "Jede Suche wird Teil eines persönlichen Tagebuchs. Schau zurück auf das, was du gefühlt und gehört hast — eine Landkarte deines emotionalen Jahres in Songs.",
    },
  ];

  const examples = [
    { mood: "Süß-bittere Nostalgie", song: "Songs, die sich anfühlen wie ein altes Foto im Sommerlicht" },
    { mood: "Stille Konzentration", song: "Instrumentale Texturen, die Aufmerksamkeit halten ohne zu fordern" },
    { mood: "Unruhige Freude", song: "Tracks, die das Kribbeln eines Freitagnachmittags vor Plänen einfangen" },
    { mood: "Schweres Herz", song: "Musik, die mit Trauer dasitzt, statt sie reparieren zu wollen" },
  ];

  const faqs = [
    {
      q: "Wie wählt Echoes Musik für meine Emotionen aus?",
      a: "Du beschreibst, was du fühlst — eine Stimmung, eine Erinnerung, einen Gedanken oder sogar ein Foto. Die KI von Echoes liest Lyrics, Klangtextur und Kontext, um Songs zu finden, die zum Gefühl passen, nicht nur zum Genre.",
    },
    {
      q: "Ist Echoes kostenlos?",
      a: "Ja — du erhältst kostenlose KI-Suchen ohne Anmeldung und mehr nach der Erstellung eines kostenlosen Kontos. Premium-Tarife schalten unbegrenzte Suchen und Bibliothekssynchronisation frei.",
    },
    {
      q: "Funktioniert es mit Spotify und Apple Music?",
      a: "Ja. Echoes spielt sofort Vorschauen ab und speichert Tracks direkt in deine Spotify- oder Apple-Music-Bibliothek.",
    },
    {
      q: "Welche Emotionen kann ich suchen?",
      a: "Alles, was du benennen kannst — Freude, Sehnsucht, Anspannung, Hoffnung, Ehrfurcht — und alles, was du nur beschreiben kannst. Je präziser deine Worte, desto genauer die Songs.",
    },
  ];

  return (
    <AppLayout headerVariant="marketing">
      <div className="min-h-screen bg-background">
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
              KI-Musiktagebuch
            </p>
            <h1 className="font-display text-4xl md:text-6xl font-bold leading-[1.08] mb-6 text-balance">
              Musik für <span className="gradient-warm-text italic">Emotionen</span> — finde Songs, die zu deinem Gefühl passen
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground font-body mb-8 max-w-2xl mx-auto leading-relaxed">
              Beschreibe ein Gefühl, eine Erinnerung oder einen Gedanken. Echoes verwandelt es in Songs, die zur Emotion passen — nicht nur zum Genre. Kostenlos testen, ohne Anmeldung.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="hero" size="lg" className="rounded-full px-7 gap-2 font-body" asChild>
                <Link to="/chat">
                  Kostenlos testen <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button variant="soft" size="lg" className="rounded-full px-7 font-body" asChild>
                <Link to="/pricing">Tarife ansehen</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-20 md:py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-center mb-14 text-balance">
              Warum ein anderer Weg zu <span className="italic">emotionaler Musik</span>
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

        <section className="py-20 md:py-24 px-6 bg-muted/20 border-y border-border/40">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-center mb-4 text-balance">
              So klingt Musik für Emotionen
            </h2>
            <p className="text-center text-muted-foreground font-body mb-12 max-w-2xl mx-auto">
              Ein paar echte Prompts, die Menschen Echoes gestellt haben — und was zurückkommt.
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

        <section className="py-20 md:py-24 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-center mb-12 text-balance">
              Häufige Fragen
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

        <section className="py-24 px-6 relative overflow-hidden">
          <div className="absolute inset-0 gradient-warm opacity-60" aria-hidden />
          <div className="relative max-w-2xl mx-auto text-center">
            <h2 className="font-display text-3xl md:text-4xl font-semibold mb-5 text-balance">
              Finde den Song, der sagt, was du meinst
            </h2>
            <p className="text-muted-foreground font-body mb-8">
              Kostenlos testen — keine Anmeldung für die ersten Suchen nötig.
            </p>
            <Button variant="hero" size="lg" className="rounded-full px-8 gap-2 font-body" asChild>
              <Link to="/chat">
                Suche starten <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default MusikFuerEmotionen;
