import type { Config } from "tailwindcss";
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        success: "hsl(142 76% 36%)",
        warning: "hsl(38 92% 50%)",
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)" },
      fontFamily: { serif: ['"DM Serif Display"', "serif"], sans: ['"DM Sans"', "system-ui", "sans-serif"] },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        "fade-in-slow": "fade-in 1.2s ease-out",
        "slide-up": "slide-up 300ms cubic-bezier(0.4, 0, 0.2, 1)",
        shimmer: "shimmer 1.5s linear infinite",
        "scale-press": "scale-press 100ms ease-out",
        "pulse-ring": "pulse-ring 1.5s ease-out infinite",
        confetti: "confetti 2s ease-out forwards",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        shimmer: {
          from: { backgroundPosition: "-200% 0" },
          to: { backgroundPosition: "200% 0" },
        },
        "scale-press": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(0.97)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(1.3)", opacity: "0" },
        },
        confetti: {
          "0%": { transform: "translateY(-20px) translateX(0) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(110vh) translateX(var(--drift, 0px)) rotate(720deg)", opacity: "0" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
