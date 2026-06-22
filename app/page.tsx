"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  MessagesSquare,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

const FEATURES = [
  {
    icon: UploadCloud,
    title: "Resume & job analyzer",
    description:
      "Paste a job description and your resume — get a skill-match score, gap analysis, and a tailored prep roadmap in seconds.",
  },
  {
    icon: MessagesSquare,
    title: "AI interview simulator",
    description:
      "A conversational interviewer that asks follow-ups, pushes back on vague answers, and adapts to your target role — by text or voice.",
  },
  {
    icon: Sparkles,
    title: "Real-time feedback engine",
    description:
      "Every answer is scored live across communication, structure, depth, and technical accuracy — with a concrete correction, not just a number.",
  },
  {
    icon: BarChart3,
    title: "Performance dashboard",
    description:
      "Track confidence, accuracy, and pacing across sessions, and see exactly which topics need more reps.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-semibold tracking-tight">InterviewOS</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/intake">
            <Button size="sm">Start practicing</Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto flex max-w-3xl flex-col items-center px-6 pt-16 pb-20 text-center md:pt-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          Runs fully local — no signup, no data leaves your browser
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="text-4xl font-semibold tracking-tight md:text-6xl"
        >
          Practice interviews that
          <span className="text-primary"> actually push back.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-5 max-w-xl text-balance text-muted-foreground md:text-lg"
        >
          InterviewOS analyzes your resume against a real job description, runs a
          conversational mock interview by text or voice, and scores every answer
          the moment you give it — so you know exactly what to fix before the real thing.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-8 flex items-center gap-3"
        >
          <Link href="/intake">
            <Button size="lg">
              Analyze my resume <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/interview/new">
            <Button size="lg" variant="outline">
              Jump straight to practice
            </Button>
          </Link>
        </motion.div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 px-6 pb-24 sm:grid-cols-2">
        {FEATURES.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
          >
            <Card className="h-full">
              <CardHeader>
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold text-foreground">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {feature.description}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </section>

      <footer className="mx-auto w-full max-w-5xl px-6 pb-10 text-xs text-muted-foreground">
        InterviewOS is an independent, original product — not affiliated with or a copy of any
        other interview-prep service.
      </footer>
    </div>
  );
}
