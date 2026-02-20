import { useEffect, useState } from 'react';
import { LivingAppsService } from '@/services/livingAppsService';
import type { Kurse, Anmeldungen } from '@/types/app';
import { BookOpen, Users, GraduationCap, DoorOpen, ClipboardList, TrendingUp, Euro, CalendarDays, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import { de } from 'date-fns/locale';

interface Stats {
  dozenten: number;
  raeume: number;
  teilnehmer: number;
  kurse: number;
  anmeldungen: number;
  kurseAktiv: number;
  umsatz: number;
  bezahlt: number;
  kurseListe: Kurse[];
  anmeldungenListe: Anmeldungen[];
}

const STATUS_COLORS: Record<string, string> = {
  geplant: '#7c3aed',
  aktiv: '#059669',
  abgeschlossen: '#b45309',
  abgesagt: '#dc2626',
};

const STATUS_LABELS: Record<string, string> = {
  geplant: 'Geplant',
  aktiv: 'Aktiv',
  abgeschlossen: 'Abgeschlossen',
  abgesagt: 'Abgesagt',
};

export default function DashboardOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [dozentenData, raeumeData, teilnehmerData, kurseData, anmeldungenData] = await Promise.all([
          LivingAppsService.getDozenten(),
          LivingAppsService.getRaeume(),
          LivingAppsService.getTeilnehmer(),
          LivingAppsService.getKurse(),
          LivingAppsService.getAnmeldungen(),
        ]);
        const bezahlt = anmeldungenData.filter(a => a.fields.bezahlt).length;
        const umsatz = kurseData.reduce((sum, k) => sum + (k.fields.preis ?? 0), 0);
        const kurseAktiv = kurseData.filter(k => k.fields.status === 'aktiv').length;
        setStats({
          dozenten: dozentenData.length,
          raeume: raeumeData.length,
          teilnehmer: teilnehmerData.length,
          kurse: kurseData.length,
          anmeldungen: anmeldungenData.length,
          kurseAktiv,
          umsatz,
          bezahlt,
          kurseListe: kurseData,
          anmeldungenListe: anmeldungenData,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Build status distribution chart data
  const statusChart = stats
    ? ['geplant', 'aktiv', 'abgeschlossen', 'abgesagt'].map(s => ({
        name: STATUS_LABELS[s],
        count: stats.kurseListe.filter(k => k.fields.status === s).length,
        color: STATUS_COLORS[s],
      }))
    : [];

  // Upcoming courses (next 30 days)
  const today = new Date();
  const soon = addDays(today, 30);
  const upcoming = stats?.kurseListe
    .filter(k => {
      if (!k.fields.startdatum) return false;
      const d = parseISO(k.fields.startdatum);
      return isAfter(d, today) && isBefore(d, soon);
    })
    .sort((a, b) => (a.fields.startdatum ?? '').localeCompare(b.fields.startdatum ?? ''))
    .slice(0, 5) ?? [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-muted-foreground text-sm font-medium">Daten werden geladen…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Hero header */}
      <div
        className="rounded-2xl p-8 text-white relative overflow-hidden"
        style={{ background: 'var(--gradient-hero)', boxShadow: 'var(--shadow-elegant)' }}
      >
        <div className="relative z-10">
          <p className="text-white/60 text-sm font-semibold tracking-widest uppercase mb-2">Kursverwaltung</p>
          <h1 className="text-4xl font-extrabold tracking-tight mb-1">Akademie-Übersicht</h1>
          <p className="text-white/70 text-base font-light">
            {format(today, "EEEE, dd. MMMM yyyy", { locale: de })}
          </p>
        </div>
        {/* decorative circles */}
        <div
          className="absolute -right-16 -top-16 w-64 h-64 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, white, transparent)' }}
        />
        <div
          className="absolute -right-4 bottom-0 w-40 h-40 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, white, transparent)' }}
        />

        {/* Hero KPIs inside the banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
          {[
            { label: 'Aktive Kurse', value: stats?.kurseAktiv ?? 0, icon: TrendingUp },
            { label: 'Anmeldungen', value: stats?.anmeldungen ?? 0, icon: ClipboardList },
            { label: 'Bezahlt', value: stats?.bezahlt ?? 0, icon: CheckCircle2 },
            { label: 'Kurse gesamt', value: stats?.kurse ?? 0, icon: BookOpen },
          ].map(item => (
            <div key={item.label} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <item.icon size={18} className="text-white/70 mb-2" />
              <div className="text-2xl font-bold">{item.value}</div>
              <div className="text-white/60 text-xs font-medium mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Secondary KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: 'Dozenten', value: stats?.dozenten ?? 0, icon: GraduationCap, color: 'oklch(0.42 0.18 270)' },
          { title: 'Teilnehmer', value: stats?.teilnehmer ?? 0, icon: Users, color: 'oklch(0.62 0.16 200)' },
          { title: 'Räume', value: stats?.raeume ?? 0, icon: DoorOpen, color: 'oklch(0.72 0.17 140)' },
          { title: 'Gesamtpreis', value: `${stats?.umsatz?.toLocaleString('de-DE') ?? 0} €`, icon: Euro, color: 'oklch(0.78 0.16 55)' },
        ].map(item => (
          <div key={item.title} className="stat-card flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${item.color}18` }}
            >
              <item.icon size={22} style={{ color: item.color }} />
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight">{item.value}</div>
              <div className="text-muted-foreground text-xs font-medium mt-0.5">{item.title}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Status chart */}
        <div className="stat-card lg:col-span-2">
          <h2 className="text-sm font-bold text-foreground mb-4 tracking-tight">Kurse nach Status</h2>
          {statusChart.every(d => d.count === 0) ? (
            <div className="flex items-center justify-center h-36 text-muted-foreground text-sm">Noch keine Kurse vorhanden</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={statusChart} barSize={32}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'oklch(0.52 0.02 265)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: 'oklch(1 0 0)',
                    border: '1px solid oklch(0.91 0.01 80)',
                    borderRadius: '0.75rem',
                    fontSize: 12,
                    boxShadow: '0 4px 16px -4px rgba(0,0,0,0.12)',
                  }}
                  cursor={{ fill: 'oklch(0.96 0.018 270)' }}
                  formatter={(value: number) => [value, 'Kurse']}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {statusChart.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Upcoming courses */}
        <div className="stat-card lg:col-span-3">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays size={16} style={{ color: 'oklch(0.42 0.18 270)' }} />
            <h2 className="text-sm font-bold text-foreground tracking-tight">Bevorstehende Kurse (30 Tage)</h2>
          </div>
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-36 text-muted-foreground text-sm gap-1">
              <CalendarDays size={28} className="opacity-30 mb-1" />
              Keine Kurse in den nächsten 30 Tagen
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map(k => (
                <div
                  key={k.record_id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'oklch(0.978 0.006 80)', transition: 'var(--transition-smooth)' }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold text-white"
                    style={{ background: k.fields.status ? STATUS_COLORS[k.fields.status] : 'oklch(0.42 0.18 270)' }}
                  >
                    {k.fields.startdatum
                      ? format(parseISO(k.fields.startdatum), 'dd')
                      : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{k.fields.titel ?? 'Unbenannter Kurs'}</div>
                    <div className="text-xs text-muted-foreground">
                      {k.fields.startdatum
                        ? format(parseISO(k.fields.startdatum), 'dd. MMMM yyyy', { locale: de })
                        : '—'}
                    </div>
                  </div>
                  {k.fields.preis != null && (
                    <div className="text-sm font-semibold shrink-0" style={{ color: 'oklch(0.42 0.18 270)' }}>
                      {k.fields.preis.toLocaleString('de-DE')} €
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
