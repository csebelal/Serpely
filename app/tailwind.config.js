/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Satoshi', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Satoshi', 'system-ui', '-apple-system', 'sans-serif'],
      },
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
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
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
        green: {
          DEFAULT: '#00C27A',
          light: '#00E08F',
          soft: '#E6FBF4',
          mid: '#00A868',
          dark: '#008451',
        },
        serpely: {
          green: "#00C27A",
          "green-dark": "#00A868",
          dark: "#0A0A0A",
          navy: "#0B0F19",
          gray: "#6B7280",
          "gray-light": "#9CA3AF",
          light: "#FAFAFA",
          teal: "#2F8E92",
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        'soft': '0 18px 50px rgba(0, 0, 0, 0.08)',
        'glow': '0 10px 30px rgba(0, 194, 122, 0.3)',
        'card': '0 2px 8px rgba(10,10,10,0.03)',
        'card-hover': '0 12px 32px rgba(10, 10, 10, 0.06)',
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
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "marqueeScroll": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "testimonialScroll": {
          "0%": { transform: "translateX(-50%)" },
          "100%": { transform: "translateX(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        "auditPulse": {
          "0%": { boxShadow: "0 0 0 0 rgba(0, 194, 122, 0.6)" },
          "70%": { boxShadow: "0 0 0 8px rgba(0, 194, 122, 0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(0, 194, 122, 0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        "fade-in-up": "fade-in-up 0.6s ease-out forwards",
        "float": "float 3s ease-in-out infinite",
        "marquee": "marqueeScroll 35s linear infinite",
        "testimonial": "testimonialScroll 48s linear infinite",
        "pulse-dot": "pulse-dot 2s ease infinite",
        "audit-pulse": "auditPulse 2s ease infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
