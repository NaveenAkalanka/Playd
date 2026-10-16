import Link from "next/link";
import {
  ArrowUpRight,
  Bookmark,
  CalendarPlus,
  Clock,
  Film,
  Gamepad2,
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
  i = 0,
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  featured?: boolean;
  i?: number;
}) {
  return (
    <div
      style={delay(i)}
      className={cn(
        cardBase,
        cardHover,
        "relative overflow-hidden p-4",
        featured && "border-accent/40 from-accent/20 via-surface to-surface",
      )}
    >
      {Icon ? (
        <span
          className={cn(
            "absolute right-3 top-3 flex size-8 items-center justify-center rounded-lg bg-surface-2 text-text-muted",
            featured && "bg-accent/20 text-accent",
          )}
        >
          <Icon className="size-4" />
        </span>
      ) : null}
      <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">{label}</p>
      <p className="mt-2 truncate pr-8 text-3xl font-extrabold tabular-nums tracking-tight">
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
      <ul className="mt-4 grid grid-cols-3 gap-3 text-sm">
        {types.map((t) => {
          const count = data.byType[t.type].count;
          return (
            <li key={t.type} className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: t.color }} />
              <span className="truncate text-text-muted">{t.label}</span>
              <span className="ml-auto tabular-nums">{Math.round((count / total) * 100)}%</span>
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
    [t.timeLabel, fmt(s.hours)],
    ["This month", fmt(s.addedThisMonth)],
    ["Wishlist", fmt(s.wishlistCount)],
  ];
  return (
    <div style={delay(i)} className={cn(cardBase, cardHover, "group p-5")}>
      <div className="flex items-center gap-3">
        <span
          className="flex size-9 items-center justify-center rounded-lg text-white"
          style={{ background: t.color }}
        >
          <t.icon className="size-4.5" />
        </span>
        <h3 className="font-bold">{t.label}</h3>
        <span className="ml-auto text-xs text-text-muted">{Math.round(share)}% of library</span>
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
    </div>
  );
}

export function DashboardView({ data }: { data: Dashboard }) {
  const { overall, byType } = data;
  const top = overall.topGenres[0];

  const overallPanel = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile featured icon={Sparkles} i={0} label="Total titles" value={fmt(overall.count)} />
        <Tile icon={Clock} i={1} label="Total hours" value={fmt(overall.hours)} />
        <Tile icon={CalendarPlus} i={2} label="Added this month" value={fmt(overall.addedThisMonth)} />
        <Tile icon={Bookmark} i={3} label="On wishlist" value={fmt(overall.wishlistCount)} />
        <Tile
          icon={Trophy}
          i={4}
          label="Top genre"
          value={top?.label ?? "—"}
          hint={top ? `${top.count} titles` : undefined}
        />
      </div>

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
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
              <Tile featured icon={t.icon} i={0} label={`Total ${t.noun}`} value={fmt(s.count)} />
              <Tile icon={Bookmark} i={1} label="On wishlist" value={fmt(s.wishlistCount)} />
              <Tile icon={Clock} i={2} label={t.timeLabel} value={fmt(s.hours)} />
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
              <Recent title="Wishlist" items={s.wishlist} href={t.href} />
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
