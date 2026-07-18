"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Check,
  MessagesSquare,
  Radio,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: UploadCloud,
    kicker: "ANALYZE",
    title: "Resume & job analyzer",
    description:
      "Paste a job description and your resume — get a skill-match score, gap analysis, and a tailored prep roadmap in seconds.",
  },
  {
    icon: MessagesSquare,
    kicker: "PRACTICE",
    title: "AI interview simulator",
    description:
      "A conversational interviewer that asks follow-ups, pushes back on vague answers, and adapts to your target role — by text or voice.",
  },
  {
    icon: Sparkles,
    kicker: "IMPROVE",
    title: "Real-time feedback engine",
    description:
      "Every answer is scored live across communication, structure, depth, and technical accuracy — with a concrete correction, not just a number.",
  },
  {
    icon: BarChart3,
    kicker: "TRACK",
    title: "Performance dashboard",
    description:
      "Track confidence, accuracy, and pacing across sessions, and see exactly which topics need more reps.",
  },
];

const PLATFORMS = ["Zoom", "Google Meet", "Microsoft Teams", "Webex", "Phone screens"];

const STEPS = [
  {
    number: "01",
    title: "Feed it the job",
    description:
      "Drop in the job description and your resume. InterviewOS maps your strengths against what the role actually asks for.",
  },
  {
    number: "02",
    title: "Run the gauntlet",
    description:
      "Mock interviews that adapt to your answers — or turn on Live Copilot during a real call for streamed answer suggestions.",
  },
  {
    number: "03",
    title: "Close the gaps",
    description:
      "Instant scoring on every answer, session recaps, and a dashboard that shows exactly where to spend your next hour of prep.",
  },
];

const PRIVACY_POINTS = [
  "Practice sessions run in your browser — nothing to install",
  "No account, no signup, no data leaves your machine by default",
  "Transcripts and history stay in local storage, deletable anytime",
  "Export any session as Markdown with one click",
];

/** Parakeet-style glyph swap: renders flagged characters in the pixel mono font. */
function Glyphs({ text, swap }: { text: string; swap: number[] }) {
  return (
    <span>
      {text.split("").map((ch, i) =>
        swap.includes(i) ? (
          <span key={i} className="font-departure">
            {ch}
          </span>
        ) : (
          <span key={i}>{ch}</span>
        )
      )}
    </span>
  );
}

export default function LandingPage() {
  return (
    <div className="dark flex min-h-screen flex-col overflow-x-clip bg-background text-foreground">
      {/* ── Nav ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold tracking-tight">
              Interview<span className="font-departure text-primary">OS</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#how" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <a href="#privacy" className="transition-colors hover:text-foreground">
              Privacy
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="hidden sm:block">
              <Button size="sm" variant="outline">
                Dashboard
              </Button>
            </Link>
            <Link href="/intake">
              <Button size="sm">Start practicing</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* light beams */}
        <div
          aria-hidden
          className="beam left-1/2 top-[-320px] h-[560px] w-[720px] -translate-x-1/2 rounded-full opacity-90"
        />
        <div
          aria-hidden
          className="beam left-[8%] top-[-120px] h-[420px] w-[120px] rotate-[24deg]"
        />
        <div
          aria-hidden
          className="beam right-[10%] top-[-140px] h-[460px] w-[140px] -rotate-[20deg]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-200px] h-[500px] w-[880px] -translate-x-1/2 rounded-full bg-primary/10 blur-[110px]"
        />

        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-6 pt-20 pb-16 text-center md:pt-28 md:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="kicker mb-6 inline-flex items-center gap-2.5 rounded-full border border-dashed border-white/15 px-4 py-1.5"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            100% local — no signup
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-hero-gradient flex flex-col gap-2 text-4xl font-bold tracking-tight md:text-6xl"
          >
            <Glyphs text="Practice interviews that" swap={[2, 12, 21]} />
            <Glyphs text="actually push back." swap={[4, 9]} />
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-6 max-w-xl text-balance text-muted-foreground md:text-lg"
          >
            InterviewOS analyzes your resume against a real job description, runs a
            conversational mock interview by text or voice, and scores every answer
            the moment you give it — so you know exactly what to fix before the real thing.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-9 flex flex-wrap items-center justify-center gap-3"
          >
            <Link href="/intake">
              <Button size="lg" className="glow-primary">
                Analyze my resume <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/interview/new">
              <Button size="lg" variant="outline">
                Jump straight to practice
              </Button>
            </Link>
          </motion.div>

          {/* platform strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-16 flex w-full flex-col items-center gap-4"
          >
            <span className="kicker">Live Copilot works alongside</span>
            <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm font-medium text-muted-foreground/80">
              {PLATFORMS.map((p) => (
                <span key={p} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-primary" />
                  {p}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────── */}
      <section id="features" className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="mb-10 flex flex-col items-center gap-3 text-center">
          <span className="kicker">[ Features ]</span>
          <h2 className="text-hero-gradient text-3xl font-bold tracking-tight md:text-4xl">
            Everything between you and the offer
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="group relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02] p-6 transition-colors hover:border-primary/25 hover:bg-white/[0.04]"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" />
                </div>
                <span className="kicker opacity-60">{feature.kicker}</span>
              </div>
              <h3 className="text-base font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────── */}
      <section id="how" className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="mb-12 flex flex-col items-center gap-3 text-center">
          <span className="kicker">[ How it works ]</span>
          <h2 className="text-hero-gradient text-3xl font-bold tracking-tight md:text-4xl">
            Three steps, zero setup
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="relative rounded-2xl border border-white/8 bg-white/[0.02] p-6"
            >
              <span className="font-departure text-3xl text-primary/60">{step.number}</span>
              <h3 className="mt-4 text-base font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Privacy ─────────────────────────────────────── */}
      <section id="privacy" className="mx-auto w-full max-w-6xl px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl border border-white/8 bg-white/[0.02] px-6 py-12 md:px-12"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute right-[-120px] top-[-120px] h-[320px] w-[320px] rounded-full bg-primary/10 blur-[110px]"
          />
          <div className="relative grid grid-cols-1 items-center gap-10 md:grid-cols-2">
            <div>
              <span className="kicker">[ Privacy ]</span>
              <h2 className="text-hero-gradient mt-3 text-3xl font-bold tracking-tight md:text-4xl">
                Yours. Local. Private.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
                Your interview prep is nobody&apos;s business. InterviewOS keeps
                everything on your machine unless you explicitly connect an AI
                provider — and even then, only the text you choose is sent.
              </p>
            </div>
            <ul className="flex flex-col gap-3">
              {PRIVACY_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
                    <ShieldCheck className="h-3 w-3 text-primary" />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </section>

      {/* ── Final CTA ───────────────────────────────────── */}
      <section className="relative mx-auto flex w-full max-w-3xl flex-col items-center px-6 py-24 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[110px]"
        />
        <span className="kicker relative">[ Ready when you are ]</span>
        <h2 className="text-hero-gradient relative mt-4 text-3xl font-bold tracking-tight md:text-5xl">
          <Glyphs text="Your next interview" swap={[3, 10]} />
          <br />
          <Glyphs text="starts here." swap={[7]} />
        </h2>
        <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/intake">
            <Button size="lg" className="glow-primary">
              Start practicing <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/live-copilot">
            <Button size="lg" variant="retro">
              <Radio className="h-4 w-4" /> Live Copilot
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-white/5">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-8 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-departure tracking-wider">INTERVIEWOS</span>
          </div>
          <p className="max-w-lg">
            InterviewOS is an independent, original product — not affiliated with or a
            copy of any other interview-prep service.
          </p>
        </div>
      </footer>
    </div>
  );
}
