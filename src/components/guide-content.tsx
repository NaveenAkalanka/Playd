/** Body of the /guide page: how to use Playd, plus the Developer section. */
import Link from "next/link";
import {
  BarChart3,
  CircleHelp,
  CodeXml,
  Compass,
  GitBranch,
  MousePointerClick,
  Search,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import packageJson from "../../package.json";

const DEVELOPER = {
  name: "Naveen Akalanka",
  github: "https://github.com/NaveenAkalanka",
  repo: "https://github.com/NaveenAkalanka/Playd",
};

// Inlined at build time (see next.config.ts); empty for local builds.
const BUILD_COMMIT = process.env.NEXT_PUBLIC_BUILD_COMMIT ?? "";

const sections = [
  { id: "start", label: "Getting started" },
  { id: "gestures", label: "Clicks & gestures" },
  { id: "library", label: "Your library" },
  { id: "search", label: "Search" },
  { id: "dashboard", label: "Dashboard" },
  { id: "faq", label: "FAQ" },
  { id: "developer", label: "Developer" },
] as const;

/** Small key-cap style label for an input method. */
function Gesture({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
      {children}
    </span>
  );
}

function Section({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    // scroll-mt clears the sticky top nav when jumping to an anchor.
    <section id={id} className="scroll-mt-20">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Icon className="size-5 text-accent" />
        {title}
      </h2>
      <div className="mt-3 rounded-md border border-border bg-surface p-4 text-sm leading-relaxed text-text-muted [&_strong]:font-semibold [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}

const gestureRows: { where: string; click: string; menu: string }[] = [
  {
    where: "Discover popup",
    click: "Add to your library (seen / played)",
    menu: "Add to wishlist · View more info",
  },
  {
    where: "Search results",
    click: "Add to your library",
    menu: "Add to wishlist · View more info",
  },
  {
    where: "Movies / TV / Games",
    click: "—",
    menu: "Add/Remove Hall of Fame · Move to wishlist · View more info · Remove",
  },
  {
    where: "Wishlist",
    click: "Copy the title",
    menu: "Mark as watched · View more info · Remove",
  },
  {
    where: "Hall of Fame",
    click: "—",
    menu: "View more info · Remove from Hall of Fame",
  },
];

export function GuideContent() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent">Guide</p>
      <h1 className="mt-1 text-3xl font-black tracking-tight">How Playd works</h1>
      <p className="mt-2 max-w-prose text-sm text-text-muted">
        Playd logs every movie, series and game you&apos;ve seen or played — fast. No
        ratings, dates or notes: a title is either in your library or it isn&apos;t.
      </p>

      {/* Jump links */}
      <nav aria-label="Guide sections" className="-mx-4 mt-5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ul className="flex w-max gap-2">
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="block rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-text-muted/40 hover:text-foreground"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-8 flex flex-col gap-10">
        <Section id="start" icon={Compass} title="Getting started">
          <ol className="flex list-decimal flex-col gap-2 pl-5 marker:font-semibold marker:text-accent">
            <li>
              Open <strong>Movies</strong>, <strong>TV</strong> or <strong>Games</strong>. The{" "}
              <strong>Discover</strong> popup opens with popular titles.
            </li>
            <li>
              <strong>Click every poster you&apos;ve already seen.</strong> It&apos;s added
              instantly and replaced with something similar, so the more you click, the
              better the suggestions get.
            </li>
            <li>
              Clicked by mistake? Hit <strong>Undo</strong> on the toast within 5 seconds.
            </li>
            <li>
              Scroll past posters you don&apos;t know — they quietly swap out for new ones.
              <strong> Show more</strong> loads a fresh batch.
            </li>
            <li>
              Close the popup to see your library. Reopen it any time with the{" "}
              <strong>Discover</strong> button.
            </li>
          </ol>
          <p className="mt-3">
            Discover opens by itself the first time you visit each tab, and again when you
            come back after an hour away.
          </p>
        </Section>

        <Section id="gestures" icon={MousePointerClick} title="Clicks & gestures">
          <p>
            Every poster has a menu: <Gesture>Right-click</Gesture> on desktop, or{" "}
            <Gesture>Long-press</Gesture> on touch.
          </p>
          <div className="mt-4 overflow-hidden rounded-md border border-border">
            {gestureRows.map((row, i) => (
              <div
                key={row.where}
                className={`grid gap-1 p-3 sm:grid-cols-[9.5rem_1fr_1.4fr] sm:gap-4 ${i % 2 ? "bg-surface" : "bg-surface-2/40"}`}
              >
                <p className="font-semibold text-foreground">{row.where}</p>
                <p className="flex items-start gap-2">
                  <Gesture>Click</Gesture>
                  <span>{row.click}</span>
                </p>
                <p className="flex items-start gap-2">
                  <Gesture>Menu</Gesture>
                  <span>{row.menu}</span>
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3">
            Removing a title from your library also offers <strong>Undo</strong> — it comes
            back exactly as it was, Hall of Fame and all.
          </p>
        </Section>

        <Section id="library" icon={SlidersHorizontal} title="Your library">
          <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-accent">
            <li>
              <strong>Search box</strong> — filters the titles you&apos;ve already logged by
              name.
            </li>
            <li>
              <strong>Sort &amp; filters</strong> — recently added, title, or year; narrow by
              genre, release year and original language. <strong>Clear</strong> resets the
              filters.
            </li>
            <li>
              <strong>View toggle</strong> — small, medium or large posters, or a compact list.
              Your choice is remembered.
            </li>
            <li>
              <strong>Wishlist</strong> holds titles you want to watch or play later;{" "}
              <strong>Mark as watched</strong> moves one into your library.
            </li>
            <li>
              <strong>Hall of Fame</strong> is a simple yes/no favourite. Removing a title from
              it never removes it from your library.
            </li>
          </ul>
        </Section>

        <Section id="search" icon={Search} title="Search">
          <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-accent">
            <li>
              Tap the <Search className="inline size-4 align-text-bottom" /> icon in the top
              bar. From a Movies, TV or Games tab, search is locked to that type and shows
              popular titles before you type, with genre and year filters.
            </li>
            <li>From Home it searches movies, TV and games together, in every language.</li>
            <li>
              Titles already in your library or wishlist are hidden, so everything you see is
              new. Keep scrolling to load more.
            </li>
          </ul>
        </Section>

        <Section id="dashboard" icon={BarChart3} title="Dashboard">
          <p>
            <strong>Home</strong> sums up everything you&apos;ve logged — counts, top genres,
            decades and recent additions — with a tab per type.
          </p>
          <p className="mt-3">
            <strong>Total playtime</strong> is shown as years, months, days and hours (a year
            counts as 365 days, a month as 30):
          </p>
          <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 marker:text-accent">
            <li>Movies use their runtime.</li>
            <li>TV series use episodes × average episode length — the whole series.</li>
            <li>
              Games use IGDB&apos;s typical time to beat. Games without that data don&apos;t
              count toward the total.
            </li>
          </ul>
        </Section>

        <Section id="faq" icon={CircleHelp} title="FAQ">
          <dl className="flex flex-col gap-4">
            <div>
              <dt className="font-semibold text-foreground">Why can&apos;t I find a title I added?</dt>
              <dd className="mt-1">
                Check the active filters and the library search box — <strong>Clear</strong>{" "}
                resets them. Search never shows titles you already have.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">Do skipped titles disappear forever?</dt>
              <dd className="mt-1">
                No. Posters you pass on can show up again on a later visit.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">Something failed to add.</dt>
              <dd className="mt-1">
                You&apos;ll see a &ldquo;Couldn&apos;t add&rdquo; message and the poster comes
                back — just try again. Movie and game databases occasionally rate-limit
                requests.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">Can I back up my library?</dt>
              <dd className="mt-1">
                Yes — <Link href="/account" className="font-medium text-accent hover:text-accent-hover">Account</Link>{" "}
                lets you export everything to a file and import it again.
              </dd>
            </div>
          </dl>
        </Section>

        <Section id="developer" icon={CodeXml} title="Developer">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div
                aria-hidden="true"
                className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent/15 text-lg font-black text-accent"
              >
                NA
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">{DEVELOPER.name}</p>
                <p>Designed and built Playd</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={DEVELOPER.github}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-md bg-surface-2 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-border"
              >
                <UserRound className="size-4" />
                GitHub
              </a>
              <a
                href={DEVELOPER.repo}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-md bg-surface-2 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-border"
              >
                <GitBranch className="size-4" />
                Source code
              </a>
            </div>
          </div>

          <div className="my-4 h-px bg-border" />

          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide">Version</dt>
              <dd className="mt-0.5 tabular-nums text-foreground">
                {packageJson.version}
                {BUILD_COMMIT ? (
                  <a
                    href={`${DEVELOPER.repo}/commit/${BUILD_COMMIT}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 font-mono text-xs text-text-muted hover:text-accent"
                  >
                    {BUILD_COMMIT}
                  </a>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide">Built with</dt>
              <dd className="mt-0.5 text-foreground">
                Next.js, TypeScript, Tailwind CSS, Neon Postgres, Drizzle
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide">Movie &amp; TV data</dt>
              <dd className="mt-0.5 text-foreground">TMDB</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide">Game data</dt>
              <dd className="mt-0.5 text-foreground">IGDB (via Twitch)</dd>
            </div>
          </dl>

          <p className="mt-4">
            Found a bug or have an idea?{" "}
            <a
              href={`${DEVELOPER.repo}/issues`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent hover:text-accent-hover"
            >
              Open an issue on GitHub
            </a>
            .
          </p>
        </Section>
      </div>
    </div>
  );
}
