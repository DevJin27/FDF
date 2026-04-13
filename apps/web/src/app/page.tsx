"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap, Database } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center pt-32 pb-20 px-4 animate-enter">
      {/* Dynamic Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Hero Section */}
      <div className="max-w-4xl text-center z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium mb-8 border border-blue-500/20">
          <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          FDF v2 is now live
        </div>
        
        <h1 className="font-heading text-6xl sm:text-7xl min-[1000px]:text-8xl font-bold tracking-tight mb-8">
          Build faster with <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">
            Solid Foundations
          </span>
        </h1>
        
        <p className="text-lg sm:text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
          The ultimate Next.js 15 starter. Powered by an Express standalone API, 
          Neon Postgres, Drizzle ORM, and beautiful glassmorphism UI.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" asChild className="w-full sm:w-auto">
            <Link href="/login">
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="w-full sm:w-auto">
            <Link href="https://github.com/fdf/starter">
              View on GitHub
            </Link>
          </Button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full mt-32 z-10 animate-enter-delay-1">
        <FeatureCard 
          icon={<Zap className="h-6 w-6 text-yellow-400" />}
          title="Blazing Fast"
          description="Standalone Express backend optimized for speed with a Next.js App Router frontend."
        />
        <FeatureCard 
          icon={<ShieldCheck className="h-6 w-6 text-green-400" />}
          title="Secure by Default"
          description="Built-in phone OTP authentication and stateless JWT session management."
        />
        <FeatureCard 
          icon={<Database className="h-6 w-6 text-blue-400" />}
          title="Type-Safe ORM"
          description="End-to-end type safety from your Neon serverless database to your React components."
        />
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-3xl glass-card transition-all hover:translate-y-[-4px] hover:shadow-[0_20px_40px_rgba(37,99,235,0.1)]">
      <div className="h-12 w-12 rounded-xl bg-white/5 flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-heading font-bold mb-3">{title}</h3>
      <p className="text-slate-400 leading-relaxed text-sm">
        {description}
      </p>
    </div>
  );
}
