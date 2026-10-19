"use client";

import Image from "next/image";
import Link from "next/link";
import { type CSSProperties, type MouseEvent, useEffect, useState } from "react";

import {
  ActivityIcon,
  BoxIcon,
  LayersIcon,
  MapPinIcon,
  ThermometerIcon,
} from "@/components/icons";
import Navbar from "@/components/navbar";
import { type PhotoCredit, TOTAL_EPOCHS, VOLCANOES } from "@/lib/catalog";
import { useTranslation } from "@/lib/i18n";

const FEATURE_ICONS = [BoxIcon, LayersIcon, ThermometerIcon, ActivityIcon];
const DATA_LAYERS = 4; // DTM, orthophoto, Gaussian Splat, LST

/** Landing photos from Wikimedia Commons (files in /public/landing). */
const HERO_PHOTO: PhotoCredit = {
  src: "/landing/agung-sunset.jpg",
  author: "Toni Wöhrl",
  license: "CC BY-SA 4.0",
  source: "https://commons.wikimedia.org/wiki/File:Sunset_Gunung_Agung_Rinjani-Lombok_2017-08-07.jpg",
};
const STORY_PHOTO: PhotoCredit = {
  src: "/landing/agung-eruption-2017.jpg",
  author: "Michael W. Ishak",
  license: "CC BY-SA 4.0",
  source: "https://commons.wikimedia.org/wiki/File:Mount_Agung,_November_2017_eruption_-_27_Nov_2017_03.jpg",
};

/** Deterministic pseudo-random numbers, so server and client render alike. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const EMBERS = (() => {
  const rand = seeded(7);
  return Array.from({ length: 34 }, () => ({
    left: rand() * 100,
    size: 1.5 + rand() * 3.5,
    duration: 7 + rand() * 9,
    delay: -rand() * 16,
    drift: (rand() - 0.5) * 160,
    opacity: 0.35 + rand() * 0.6,
  }));
})();

const ArrowRight = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const Check = () => (
  <svg
    className="mt-0.5 h-4 w-4 shrink-0 text-brand"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12l5 5L20 7" />
  </svg>
);

/** Counts up from 0 once mounted (ease-out). */
function CountUp({ value, delay = 0 }: { value: number; delay?: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / 1400));
      setShown(Math.round(value * (1 - (1 - p) ** 3)));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, delay]);
  return <>{shown}</>;
}

/** Fades `.reveal` elements in on scroll and drives `[data-parallax]` layers. */
function useScrollEffects() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => io.disconnect();
    const layers = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      for (const el of layers) {
        const box = el.parentElement!.getBoundingClientRect();
        if (box.bottom < -vh || box.top > 2 * vh) continue;
        // Positive speed: the layer lags behind the page (moves slower).
        const offset = (vh / 2 - (box.top + box.height / 2)) * Number(el.dataset.parallax);
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
}

/** Cursor position for `.spotlight` cards. */
function trackSpotlight(event: MouseEvent<HTMLElement>) {
  const box = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty("--mx", `${event.clientX - box.left}px`);
  event.currentTarget.style.setProperty("--my", `${event.clientY - box.top}px`);
}

const delay = (ms: number) => ({ "--delay": `${ms}ms` }) as CSSProperties;

function Hero() {
  const { t, locale } = useTranslation();
  const words = t.landing.heroTitle.split(" ");
  const stats = [
    { value: VOLCANOES.length, label: t.landing.statVolcanoes },
    { value: TOTAL_EPOCHS, label: t.landing.statEpochs },
    { value: DATA_LAYERS, label: t.landing.statLayers },
  ];

  return (
    <section className="relative overflow-hidden bg-[#0d0806] text-white">
      {/* Photo: slow zoom on load, parallax on scroll. */}
      <div data-parallax="0.35" className="absolute inset-x-0 -top-[8%] h-[116%] will-change-transform">
        <div className="motion-anim absolute inset-0 animate-[ken-burns_20s_cubic-bezier(.2,.6,.2,1)_both]">
          <Image
            src={HERO_PHOTO.src}
            alt="Gunung Agung"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[62%_45%]"
          />
        </div>
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(13,8,6,0.88)_0%,rgba(13,8,6,0.55)_45%,rgba(13,8,6,0.1)_75%)]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-canvas to-transparent" />

      {/* Survey grid with a sweeping scan line: the "digital" in digital twin. */}
      <div className="absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(ellipse_70%_60%_at_65%_45%,black,transparent)]" />
      <div className="motion-anim pointer-events-none absolute inset-x-0 top-0 h-28 animate-[scan_9s_linear_1.2s_infinite] border-b border-[#ff8a4c]/70 bg-gradient-to-b from-transparent to-[#ff6a2b]/15 opacity-0 shadow-[0_8px_30px_-6px_rgba(255,106,43,0.6)]" />

      {/* Lava glow and rising embers. */}
      <div className="motion-anim absolute -bottom-48 left-[58%] h-96 w-[70%] -translate-x-1/2 animate-[glow-breathe_7s_ease-in-out_infinite] rounded-full bg-[#ff4d12]/35 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {EMBERS.map((e, i) => (
          <span
            key={i}
            className="motion-anim absolute -bottom-3 rounded-full bg-[#ffb070] shadow-[0_0_10px_2px_rgba(255,110,40,0.75)]"
            style={
              {
                left: `${e.left}%`,
                width: e.size,
                height: e.size,
                animation: `ember ${e.duration}s linear ${e.delay}s infinite`,
                "--ember-drift": `${e.drift}px`,
                "--ember-opacity": e.opacity,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="relative mx-auto flex min-h-[max(100svh,680px)] max-w-6xl flex-col justify-end px-4 pt-40 pb-20 sm:px-6 sm:pt-32 sm:pb-32">
        <span className="inline-flex w-fit animate-pop-in items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/85 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="motion-anim absolute inset-0 animate-ping rounded-full bg-[#ff6a2b]" />
            <span className="relative h-2 w-2 rounded-full bg-[#ff6a2b]" />
          </span>
          {t.landing.badge}
        </span>

        <h1 key={locale} className="mt-6 max-w-4xl text-[2.6rem] leading-[1.06] font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
          {words.map((word, i) => (
            <span key={i} className="inline-block overflow-hidden pb-[0.1em] align-bottom">
              <span
                className="motion-anim inline-block animate-[rise_0.9s_cubic-bezier(.22,1,.36,1)_both]"
                style={{ animationDelay: `${150 + i * 70}ms` }}
              >
                {word}&nbsp;
              </span>
            </span>
          ))}
          <span className="inline-block overflow-hidden pb-[0.1em] align-bottom">
            <span
              className="motion-anim inline-block animate-[rise_0.9s_cubic-bezier(.22,1,.36,1)_both]"
              style={{ animationDelay: `${150 + words.length * 70}ms` }}
            >
              <span className="motion-anim animate-[gradient-pan_5s_linear_infinite] bg-[linear-gradient(90deg,#ff6a2b,#ffc078,#ff8a4c,#ff6a2b)] bg-[length:200%_auto] bg-clip-text text-transparent">
                {t.landing.heroHighlight}
              </span>
            </span>
          </span>
        </h1>

        <p
          className="mt-6 max-w-xl animate-fade-in text-base text-white/75 [animation-delay:700ms] sm:text-lg"
          style={{ animationDuration: "0.9s" }}
        >
          {t.landing.heroDescription}
        </p>

        <div className="mt-9 flex animate-fade-in flex-wrap gap-3 [animation-delay:850ms]" style={{ animationDuration: "0.9s" }}>
          <Link
            href="/digital-twin"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-[#ff6a2b] px-6 py-3.5 text-sm font-bold text-white shadow-[0_10px_40px_-8px_rgba(255,106,43,0.8)] transition-transform hover:-translate-y-0.5"
          >
            <span className="absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-white/30 transition-[left] duration-700 group-hover:left-[120%]" />
            {t.landing.openDigitalTwin}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/slice-comparison"
            className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-md transition-colors hover:bg-white/20"
          >
            <LayersIcon className="h-4 w-4" aria-hidden="true" />
            {t.landing.openSliceComparison}
          </Link>
        </div>

        <dl className="mt-12 grid max-w-md animate-fade-in grid-cols-3 gap-6 [animation-delay:1000ms]" style={{ animationDuration: "0.9s" }}>
          {stats.map((stat, i) => (
            <div key={stat.label} className="border-l border-white/20 pl-4">
              <dd className="text-3xl font-extrabold tabular-nums sm:text-4xl">
                <CountUp value={stat.value} delay={1000 + i * 150} />
              </dd>
              <dt className="mt-1 text-xs font-medium text-white/60">{stat.label}</dt>
            </div>
          ))}
        </dl>
      </div>

      <div className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-white/60 uppercase sm:flex">
        <span className="flex h-9 w-6 justify-center rounded-full border-2 border-white/40 pt-1.5">
          <span className="motion-anim h-2 w-1 animate-[scroll-dot_1.8s_ease-in-out_infinite] rounded-full bg-white/80" />
        </span>
        {t.landing.scrollHint}
      </div>
    </section>
  );
}

/** Endless strip of dataset codes (AGU-E01 · 2017 …). */
function CodeMarquee() {
  const { t } = useTranslation();
  const items = VOLCANOES.flatMap((v) => v.epochs.map((e) => ({ code: e.code, date: e.date, name: v.name })));
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center gap-8 pr-8" aria-hidden={hidden || undefined}>
      {items.map((item) => (
        <li key={item.code} className="flex items-center gap-2.5 whitespace-nowrap">
          <span className="font-mono text-[13px] font-bold text-brand">{item.code}</span>
          <span className="text-[13px] font-medium text-muted">
            {item.name} · {item.date}
          </span>
          <span className="ml-6 h-1 w-1 rounded-full bg-mist" />
        </li>
      ))}
    </ul>
  );
  return (
    <section className="relative border-y border-line bg-surface py-4">
      <div className="mx-auto flex max-w-[1680px] items-center gap-6 px-4">
        <span className="hidden shrink-0 rounded-full bg-brand-soft px-3 py-1 text-[11px] font-bold tracking-wider text-brand uppercase sm:block">
          {t.landing.datasetCodes}
        </span>
        <div className="group relative flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]">
          <div className="motion-anim flex w-max animate-[marquee_38s_linear_infinite] group-hover:[animation-play-state:paused]">
            {row(false)}
            {row(true)}
          </div>
        </div>
      </div>
    </section>
  );
}

function Modules() {
  const { t } = useTranslation();
  const modules = [
    {
      href: "/digital-twin",
      title: t.landing.digitalTwinTitle,
      description: t.landing.digitalTwinDescription,
      points: t.landing.digitalTwinPoints,
      icon: BoxIcon,
    },
    {
      href: "/slice-comparison",
      title: t.landing.sliceTitle,
      description: t.landing.sliceDescription,
      points: t.landing.slicePoints,
      icon: LayersIcon,
    },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-28">
      <div className="reveal max-w-2xl">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t.landing.modulesTitle}</h2>
        <p className="mt-3 text-muted">{t.landing.modulesSubtitle}</p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {modules.map(({ href, title, description, points, icon: Icon }, i) => (
          <Link
            key={href}
            href={href}
            onMouseMove={trackSpotlight}
            style={delay(i * 120)}
            className="reveal spotlight group relative flex flex-col overflow-hidden rounded-[28px] border border-line bg-surface p-7 shadow-[var(--site-shadow)] transition-[border-color,translate] duration-300 hover:-translate-y-1 hover:border-brand/40 sm:p-8"
          >
            <span className="pointer-events-none absolute -top-6 right-4 font-mono text-[120px] leading-none font-extrabold text-ink/[0.04] transition-colors duration-500 group-hover:text-brand/10">
              0{i + 1}
            </span>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand transition-transform duration-500 group-hover:rotate-[-8deg] group-hover:scale-110">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="mt-6 text-2xl font-extrabold">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
            <ul className="mt-6 space-y-2.5 text-sm text-ink-body">
              {points.map((point) => (
                <li key={point} className="flex gap-2.5">
                  <Check />
                  {point}
                </li>
              ))}
            </ul>
            <span className="mt-8 inline-flex items-center gap-1.5 text-sm font-bold text-brand">
              {t.landing.open} {title}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1.5" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Story() {
  const { t } = useTranslation();
  return (
    <section className="relative h-[85vh] min-h-[540px] overflow-hidden bg-[#0d0806] text-white">
      <div data-parallax="0.3" className="absolute inset-x-0 -top-[20%] h-[140%] will-change-transform">
        <Image src={STORY_PHOTO.src} alt="Letusan Gunung Agung, November 2017" fill sizes="100vw" className="object-cover object-[50%_40%]" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0806] via-[#0d0806]/40 to-[#0d0806]/20" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(13,8,6,0.85),transparent_70%)]" />
      <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-end px-4 pb-20 sm:px-6">
        <p className="reveal font-mono text-xs font-bold tracking-[0.25em] text-[#ff8a4c] uppercase">{t.landing.storyKicker}</p>
        <h2 className="reveal mt-4 max-w-3xl text-3xl leading-tight font-extrabold tracking-tight sm:text-5xl" style={delay(100)}>
          {t.landing.storyTitle}
        </h2>
        <p className="reveal mt-5 max-w-xl text-white/75 sm:text-lg" style={delay(200)}>
          {t.landing.storyBody}
        </p>
      </div>
    </section>
  );
}

function Features() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
      <h2 className="reveal text-3xl font-extrabold tracking-tight sm:text-4xl">{t.landing.featuresTitle}</h2>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {t.landing.features.map((feature, i) => {
          const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length];
          return (
            <div
              key={feature.title}
              onMouseMove={trackSpotlight}
              style={delay(i * 90)}
              className="reveal spotlight group rounded-3xl border border-line bg-surface p-6 transition-[border-color,translate] duration-300 hover:-translate-y-1 hover:border-brand/40"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand transition-transform duration-500 group-hover:scale-110">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="mt-5 font-bold">{feature.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{feature.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Volcanoes() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      <h2 className="reveal text-3xl font-extrabold tracking-tight sm:text-4xl">{t.landing.volcanoesTitle}</h2>
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {VOLCANOES.map((volcano, i) => (
          <Link
            key={volcano.id}
            href={`/digital-twin?v=${volcano.code}`}
            style={delay(i * 120)}
            className="reveal group relative block aspect-[4/3] overflow-hidden rounded-[28px] bg-[#1a120e] text-white shadow-[var(--site-shadow)]"
          >
            {volcano.photo ? (
              <Image
                src={volcano.photo.src}
                alt={volcano.name}
                fill
                sizes="(min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-[1.4s] ease-out group-hover:scale-[1.07]"
              />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_30%,#ff6a2b55,transparent_60%)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />

            <div className="absolute top-5 left-5 flex gap-2 font-mono text-[11px] font-bold">
              <span className="rounded-full bg-black/45 px-2.5 py-1 backdrop-blur-md">{volcano.indexCode}</span>
              <span className="rounded-full bg-[#ff6a2b] px-2.5 py-1">{volcano.code}</span>
            </div>

            <div className="absolute inset-x-0 bottom-0 p-6">
              <h3 className="text-2xl font-extrabold">{volcano.name}</h3>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-white/70">
                <MapPinIcon className="h-3 w-3" />
                {volcano.province} · {volcano.type}
              </p>
              <div className="mt-4 flex items-end justify-between gap-4">
                <dl className="flex gap-6">
                  <div>
                    <dt className="text-[11px] text-white/60">{t.landing.elevation}</dt>
                    <dd className="font-bold tabular-nums">{volcano.elevation} m</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-white/60">{t.landing.epochs}</dt>
                    <dd className="font-bold tabular-nums">{volcano.epochs.length}</dd>
                  </div>
                </dl>
                <span className="inline-flex translate-y-1 items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-xs font-bold opacity-90 backdrop-blur-md transition-all duration-300 group-hover:translate-y-0 group-hover:bg-[#ff6a2b] group-hover:opacity-100">
                  {t.landing.explore}
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  const { t } = useTranslation();
  const photos = [HERO_PHOTO, STORY_PHOTO, ...VOLCANOES.flatMap((v) => (v.photo ? [v.photo] : []))];
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-xs text-muted sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p>{t.landing.footer}</p>
          <a href="mailto:ruliandaru@ugm.ac.id" className="hover:text-brand">
            ruliandaru@ugm.ac.id
          </a>
        </div>
        <p className="text-subtle">
          {t.landing.photoCredits}:{" "}
          {photos.map((photo, i) => (
            <span key={photo.src}>
              {i > 0 && " · "}
              <a href={photo.source} target="_blank" rel="noreferrer" className="hover:text-brand">
                {photo.author}
              </a>{" "}
              ({photo.license})
            </span>
          ))}
          , Wikimedia Commons.
        </p>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  useScrollEffects();
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <Navbar overlay />
      <main>
        <Hero />
        <CodeMarquee />
        <Modules />
        <Story />
        <Features />
        <Volcanoes />
      </main>
      <Footer />
    </div>
  );
}
