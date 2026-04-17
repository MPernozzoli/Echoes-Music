import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        warm: {
          glow: "hsl(var(--warm-glow))",
          "glow-muted": "hsl(var(--warm-glow-muted))",
        },
        surface: {
          elevated: "hsl(var(--surface-elevated))",
          overlay: "hsl(var(--surface-overlay))",
          card: "hsl(var(--surface-card))",
          hero: "hsl(var(--surface-hero))",
          player: "hsl(var(--surface-player))",
          elevatedStrong: "hsl(var(--surface-elevated-strong))",
        },
        borderSubtle: "hsl(var(--border-subtle))",
        ringGlow: "hsl(var(--ring-glow))",
        emotional: {
          tag: "hsl(var(--emotional-tag))",
          "tag-foreground": "hsl(var(--emotional-tag-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        display: ["Playfair Display", "serif"],
        body: ["Inter", "sans-serif"],
      },
      boxShadow: {
        soft: "0 4px 24px hsl(0 0% 0% / 0.06)",
        elevated: "var(--shadow-elevated)",
        glow: "0 0 40px hsl(var(--ring-glow) / 0.2), 0 0 80px hsl(var(--ring-glow) / 0.08)",
        player: "var(--shadow-player)",
      },
      backgroundImage: {
        "brand-gradient": "var(--gradient-brand)",
        "hero-gradient": "var(--gradient-hero)",
        "player-gradient": "var(--gradient-player)",
        "artwork-radial":
          "radial-gradient(ellipse 120% 80% at 50% 0%, hsl(var(--artwork-h) var(--artwork-s) var(--artwork-l) / 0.42) 0%, hsl(var(--background)) 58%)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        gradientDrift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        glowPulse: {
          "0%, 100%": { opacity: "0.55", filter: "brightness(1)" },
          "50%": { opacity: "1", filter: "brightness(1.08)" },
        },
        artworkFloat: {
          "0%, 100%": { transform: "translateY(0) scale(1)" },
          "50%": { transform: "translateY(-6px) scale(1.02)" },
        },
        vinylSpin: {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        waveBars: {
          "0%, 100%": { transform: "scaleY(0.35)", opacity: "0.7" },
          "50%": { transform: "scaleY(1)", opacity: "1" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "gradient-drift": "gradientDrift 12s ease infinite",
        "glow-pulse": "glowPulse 3s ease-in-out infinite",
        "artwork-float": "artworkFloat 5s ease-in-out infinite",
        "vinyl-spin": "vinylSpin 8s linear infinite",
        "wave-bars": "waveBars 0.9s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
