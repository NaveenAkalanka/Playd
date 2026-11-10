import Link from "next/link";
import {
  ArrowUpRight,
  Bookmark,
  CalendarPlus,
  Film,
  Gamepad2,
  Hourglass,
  LayoutDashboard,
  Sparkles,
  Timer,
  Trophy,
  Tv,
} from "lucide-react";
import { PosterCard } from "@/components/poster-card";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { CountUp } from "@/components/count-up";
import { cn } from "@/lib/utils";
import type { BarRow, Dashboard, RecentItem, TypeSection } from "@/lib/actions/dashboard";
import type { MediaType } from "@/lib/normalize";

const types: {
  type: MediaType;
  label: string;
  noun: string;
  href: string;
  timeLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Fill colour used for this type in the library-mix bar. */
  color: string;
}[] = [
  { type: "movie", label: "Movies", noun: "movies", href: "/movies", timeLabel: "Hours watched", icon: Film, color: "#d7263d" },
  { type: "tv", label: "TV", noun: "series", href: "/tv", timeLabel: "Hours watched", icon: Tv, color: "#f08a97" },
  { type: "game", label: "Games", noun: "games", href: "/games", timeLabel: "Hours played", icon: Gamepad2, color: "#6f6f78" },
];

const fmt = (n: number | null) => (n == null ? "—" : n);

/** Numbers count up on view; strings (e.g. "2h 5m", "—") render as-is. */
function Value({ v }: { v: number | string }) {
  return typeof v === "number" ? <CountUp value={v} /> : <>{v}</>;
}

/** Stagger delay for the nth child of a group. */
const delay = (i: number) => ({ "--d": `${i * 70}ms` }) as React.CSSProperties;

function fmtDuration(minutes: number | null) {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

const MIN_PER_HOUR = 60;
const MIN_PER_DAY = 24 * MIN_PER_HOUR;
// Calendar-agnostic units: a month is 30 days, a year 365 days.
const MIN_PER_MONTH = 30 * MIN_PER_DAY;
const MIN_PER_YEAR = 365 * MIN_PER_DAY;

function splitDuration(totalMinutes: number) {
  let rest = Math.max(0, Math.round(totalMinutes));
  const years = Math.floor(rest / MIN_PER_YEAR);
  rest -= years * MIN_PER_YEAR;
  const months = Math.floor(rest / MIN_PER_MONTH);
  rest -= months * MIN_PER_MONTH;
  const days = Math.floor(rest / MIN_PER_DAY);
  rest -= days * MIN_PER_DAY;
  const hours = Math.floor(rest / MIN_PER_HOUR);
  return { years, months, days, hours };
}

const cardBase =
  "animate-fade-up rounded-xl border border-border bg-gradient-to-br from-surface to-surface-2/30";
const cardHover =
  "transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-[0_8px_30px_-12px_var(--accent)]";

function Tile({
  label,
  value,
  hint,
  icon: Icon,
  featured,
  wide,
  i = 0,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  featured?: boolean;
  /** Spans both columns of the 2-column phone grid (avoids an orphan tile). */
  wide?: boolean;
  i?: number;
}) {
  return (
    <div
      style={delay(i)}
      className={cn(
        cardBase,
        cardHover,
        "relative min-w-0 overflow-hidden p-4",
        featured && "border-accent/40 from-accent/20 via-surface to-surface",
        wide && "col-span-2 lg:col-span-1",
      )}
    >
      {Icon ? (
        <span
          className={cn(
            "absolute right-3 top-3 hidden size-8 items-center justify-center rounded-lg bg-surface-2 text-text-muted sm:flex",
            featured && "bg-accent/20 text-accent",
          )}
        >
          <Icon className="size-4" />
        </span>
      ) : null}
      <p className="text-[11px] font-medium uppercase leading-tight tracking-wider text-text-muted sm:pr-10">
        {label}
      </p>
      <p className="mt-2 truncate text-3xl font-extrabold tabular-nums tracking-tight">
        <Value v={value} />
      </p>
      {hint ? <p className="mt-1 truncate text-xs text-text-muted/80">{hint}</p> : null}
    </div>
  );
}

function Card({
  title,
  subtitle,
  i = 0,
  children,
}: {
  title: string;
  subtitle?: string;
  i?: number;
  children: React.ReactNode;
}) {
  return (
    <div style={delay(i)} className={cn(cardBase, "p-5")}>
      <div className="mb-4">
        <h3 className="font-bold">{title}</h3>
        {subtitle ? <p className="text-xs text-text-muted">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

const noData = <p className="text-sm text-text-muted">No data yet.</p>;

/**
 * Total time spent, broken down into years / months / days / hours.
 * Leading zero units are dimmed so the first meaningful unit stands out.
 */
function PlaytimeCard({
  title,
  minutes,
  count,
  noun,
  breakdown,
  i = 0,
}: {
  title: string;
  minutes: number | null;
  count: number;
  noun: string;
  /** Optional per-type split shown under the units (overall panel only). */
  breakdown?: { label: string; color: string; minutes: number | null }[];
  i?: number;
}) {
  const parts = minutes == null ? null : splitDuration(minutes);
  const units: [string, number][] = parts
    ? [
        ["Years", parts.years],
        ["Months", parts.months],
        ["Days", parts.days],
        ["Hours", parts.hours],
      ]
    : [];
  const firstNonZero = units.findIndex(([, v]) => v > 0);

  return (
    <div
      style={delay(i)}
      className={cn(
        cardBase,
        "relative overflow-hidden border-accent/30 from-accent/15 via-surface to-surface p-5",
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">{title}</h3>
          <p className="text-xs text-text-muted">
            {minutes == null
              ? "No runtime data yet"
              : `${Math.round(minutes / 60).toLocaleString("en-US")} hours across ${count.toLocaleString("en-US")} ${noun}`}
          </p>
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/20 text-accent">
          <Hourglass className="size-4" />
        </span>
      </div>

      {parts == null ? (
        noData
      ) : (
        <dl className="grid grid-cols-4 divide-x divide-border/70 rounded-lg border border-border/70 bg-bg/40">
          {units.map(([label, value], n) => {
            const dim = firstNonZero === -1 ? n < units.length - 1 : n < firstNonZero;
            return (
              <div key={label} className="flex min-w-0 flex-col-reverse items-center px-1 py-4 sm:py-5">
                <dt className="mt-1 truncate text-[11px] uppercase tracking-wider text-text-muted">
                  {label}
                </dt>
                <dd
                  className={cn(
                    "text-3xl font-extrabold tabular-nums tracking-tight sm:text-5xl",
                    dim ? "text-text-muted/40" : n === firstNonZero ? "text-accent" : "text-text",
                  )}
                >
                  <CountUp value={value} />
                </dd>
              </div>
            );
          })}
        </dl>
      )}

      {breakdown && parts != null ? (
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-text-muted">
          {breakdown.map((b) => (
            <li key={b.label} className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: b.color }} />
              {b.label}
              <span className="tabular-nums text-text">
                {b.minutes == null ? "—" : `${Math.round(b.minutes / 60).toLocaleString("en-US")}h`}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Horizontal ranked bars; the leader is full-strength, the rest softer. */
function Bars({
  title,
  subtitle,
  rows,
  i = 0,
}: {
  title: string;
  subtitle?: string;
  rows: BarRow[];
  i?: number;
}) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <Card title={title} subtitle={subtitle} i={i}>
      {rows.length === 0 ? (
        noData
      ) : (
        <ul className="space-y-3">
          {rows.map((r, n) => (
            <li key={r.label} className="text-sm">
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className={cn("truncate", n === 0 ? "font-medium" : "text-text-muted")}>
                  {r.label}
                </span>
                <span className="tabular-nums text-text-muted">{r.count}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className={cn(
                    "animate-bar-grow h-full rounded-full bg-gradient-to-r from-accent-hover to-accent",
                    n !== 0 && "opacity-60",
                  )}
                  style={{ width: `${(r.count / max) * 100}%`, ...delay(i + 2 + n * 0.6) }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Vertical columns for ordered series (decades, months). */
function Columns({
  title,
  subtitle,
  rows,
  i = 0,
}: {
  title: string;
  subtitle?: string;
  rows: BarRow[];
  i?: number;
}) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  const empty = rows.every((r) => r.count === 0);
  return (
    <Card title={title} subtitle={subtitle} i={i}>
      {empty ? (
        noData
      ) : (
        <div className="flex h-44 items-end gap-1.5">
          {rows.map((r, n) => {
            const isMax = r.count === max;
            return (
              <div key={r.label} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                <span
                  className={cn(
                    "mb-1 text-center text-[10px] tabular-nums",
                    isMax ? "font-semibold text-text" : "text-text-muted",
                    r.count === 0 && "invisible",
                  )}
                >
                  {r.count}
                </span>
                <div
                  title={`${r.label}: ${r.count}`}
                  className={cn(
                    "animate-col-grow w-full rounded-t-[4px] bg-gradient-to-t from-accent-hover to-accent",
                    !isMax && "opacity-60",
                    r.count === 0 && "bg-none bg-surface-2",
                  )}
                  style={{
                    height: r.count === 0 ? "3px" : `${Math.max((r.count / max) * 82, 4)}%`,
                    ...delay(i + 1 + n * 0.4),
                  }}
                />
                <span className="mt-2 truncate text-center text-[10px] text-text-muted">
                  {r.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/** Stacked bar showing each type's share of the whole library. */
function LibraryMix({ data, i = 0 }: { data: Dashboard; i?: number }) {
  const total = data.overall.count || 1;
  return (
    <Card title="Library mix" subtitle="Share of everything you've logged" i={i}>
      <div className="flex h-3 overflow-hidden rounded-full bg-surface-2">
        {types.map((t, n) => (
          <div
            key={t.type}
            title={`${t.label}: ${data.byType[t.type].count}`}
            className="animate-bar-grow h-full"
            style={{
              width: `${(data.byType[t.type].count / total) * 100}%`,
              background: t.color,
              ...delay(i + 1 + n * 0.5),
            }}
          />
        ))}
      </div>
      <ul className="mt-5 divide-y divide-border text-sm">
        {types.map((t) => {
          const count = data.byType[t.type].count;
          return (
            <li key={t.type} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: t.color }} />
              <span className="text-text-muted">{t.label}</span>
              <span className="ml-auto tabular-nums text-text-muted">
                {count.toLocaleString("en-US")}
              </span>
              <span className="w-11 text-right font-semibold tabular-nums">
                {Math.round((count / total) * 100)}%
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Recent({
  title = "Recently added",
  items,
  href,
}: {
  title?: string;
  items: RecentItem[];
  href: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="font-bold">{title}</h3>
        <Link
          href={href}
          className="flex items-center gap-0.5 text-sm text-accent hover:text-accent-hover"
        >
          See all <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 py-4 md:-mx-10 md:px-10 [mask-image:linear-gradient(to_right,black_94%,transparent)]">
        {items.map((item, n) => (
          <div
            key={item.id}
            style={delay(Math.min(n, 12) * 0.5)}
            className="animate-fade-up w-28 shrink-0 md:w-36"
          >
            <PosterCard title={item.title} year={item.year} posterUrl={item.posterUrl} />
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryCard({
  t,
  s,
  share,
  i = 0,
}: {
  t: (typeof types)[number];
  s: TypeSection;
  share: number;
  i?: number;
}) {
  const stats: [string, number | string][] = [
    ["Titles", fmt(s.count)],
    ["Hours", fmt(s.hours)],
    ["This month", fmt(s.addedThisMonth)],
    ["Wishlist", fmt(s.wishlistCount)],
  ];
  return (
    <Link
      href={t.href}
      aria-label={`Open ${t.label}`}
      style={delay(i)}
      className={cn(cardBase, cardHover, "group block p-5 outline-none focus-visible:ring-2 focus-visible:ring-accent")}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex size-9 items-center justify-center rounded-lg text-white"
          style={{ background: t.color }}
        >
          <t.icon className="size-4.5" />
        </span>
        <h3 className="font-bold">{t.label}</h3>
        <span className="ml-auto flex items-center gap-1 text-xs text-text-muted">
          {Math.round(share)}% of library
          <ArrowUpRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
        </span>
      </div>
      <dl className="mt-5 grid grid-cols-4 gap-2">
        {stats.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dd className="text-2xl font-extrabold tabular-nums tracking-tight">
              <Value v={value} />
            </dd>
            <dt className="truncate text-[11px] text-text-muted">{label}</dt>
          </div>
        ))}
      </dl>
    </Link>
  );
}

export function DashboardView({ data }: { data: Dashboard }) {
  const { overall, byType } = data;
  const top = overall.topGenres[0];

  const overallPanel = (
    <div className="space-y-6">
      {/* Hours live in the playtime card below, so no separate hours tile. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile featured icon={Sparkles} i={0} label="Total titles" value={fmt(overall.count)} />
        <Tile icon={CalendarPlus} i={1} label="Added this month" value={fmt(overall.addedThisMonth)} />
        <Tile icon={Bookmark} i={2} label="On wishlist" value={fmt(overall.wishlistCount)} />
        <Tile
          icon={Trophy}
          i={3}
          label="Top genre"
          value={top?.label ?? "—"}
          hint={top ? `${top.count} titles` : undefined}
        />
      </div>

      <PlaytimeCard
        i={5}
        title="Total playtime"
        minutes={overall.minutes}
        count={overall.count}
        noun="titles"
        breakdown={types.map((t) => ({
          label: t.label,
          color: t.color,
          minutes: byType[t.type].minutes,
        }))}
      />

      <div className="grid gap-4 md:grid-cols-3">
        {types.map((t, n) => (
          <CategoryCard
            key={t.type}
            t={t}
            s={byType[t.type]}
            share={(byType[t.type].count / (overall.count || 1)) * 100}
            i={5 + n}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <LibraryMix data={data} i={8} />
        <div className="lg:col-span-2">
          <Columns title="Added, last 12 months" subtitle="Titles logged per month" rows={overall.addedByMonth} i={9} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Bars i={10} title="Top genres" subtitle="Across movies, series and games" rows={overall.topGenres} />
        <Columns i={11} title="Titles by decade" subtitle="By release year" rows={overall.decades} />
      </div>
    </div>
  );

  const detailTabs = types.map((t) => {
    const s = byType[t.type];
    return {
      key: t.type,
      label: t.label,
      icon: <t.icon className="size-4" />,
      content:
        s.count === 0 && s.wishlistCount === 0 ? (
          <p className="py-10 text-center text-text-muted">Nothing logged yet.</p>
        ) : (
          <div className="space-y-6">
            <div
              className={cn(
                "grid grid-cols-2 gap-3",
                s.recentReleasePct != null ? "lg:grid-cols-5" : "lg:grid-cols-4",
              )}
            >
              <Tile
                featured
                wide={s.recentReleasePct != null}
                icon={t.icon}
                i={0}
                label={`Total ${t.noun}`}
                value={fmt(s.count)}
              />
              <Tile icon={Bookmark} i={1} label="On wishlist" value={fmt(s.wishlistCount)} />
              <Tile
                icon={Timer}
                i={3}
                label={t.type === "game" ? "Avg. time to beat" : "Avg. runtime"}
                value={fmtDuration(s.avgMinutes)}
              />
              <Tile
                icon={Trophy}
                i={4}
                label="Longest"
                value={fmtDuration(s.longest?.minutes ?? null)}
                hint={s.longest?.title}
              />
              {s.recentReleasePct != null ? (
                <Tile icon={Sparkles} i={5} label="Last 10 years" value={`${s.recentReleasePct}%`} />
              ) : null}
            </div>
            <PlaytimeCard
              i={6}
              title={t.type === "game" ? "Total time played" : "Total time watched"}
              minutes={s.minutes}
              count={s.count}
              noun={t.noun}
            />
            <div className="grid gap-4 lg:grid-cols-2">
              <Bars i={5} title="Top genres" rows={s.topGenres} />
              <Columns i={6} title="Titles by decade" subtitle="By release year" rows={s.decades} />
              <Columns i={7} title="Added, last 12 months" rows={s.addedByMonth} />
              {s.languages.length ? (
                <Bars i={8} title="Original language" rows={s.languages} />
              ) : null}
            </div>
            <div className="space-y-4 pt-2">
              <Recent items={s.recent} href={t.href} />
              <Recent title="Wishlist" items={s.wishlist} href={`/wishlist?type=${t.type}`} />
            </div>
          </div>
        ),
    };
  });

  return (
    <div className="px-4 md:px-10">
      <DashboardTabs
        tabs={[
          {
            key: "overall",
            label: "Overall",
            icon: <LayoutDashboard className="size-4" />,
            content: overallPanel,
          },
          ...detailTabs,
        ]}
      />
    </div>
  );
}
