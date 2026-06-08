'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CalendarEvent, TodoItem, Goal } from '@/lib/types';
import { addCalendarEvent, deleteCalendarEvent, markEventNotified, toggleTodo, toggleGoal } from '@/lib/store';
import { goalDayToISO, getWeekNumber, getYear } from '@/lib/utils';

interface Props {
  events: CalendarEvent[];
  todos?: TodoItem[];
  goals?: Goal[];
  yearlyGoals?: Goal[];
  userId: string;
  familyId?: string;
  scope: 'self' | 'family';
  onRefresh: () => void;
}

type AgendaItem =
  | { kind: 'event'; date: string; data: CalendarEvent }
  | { kind: 'todo';  date: string; data: TodoItem }
  | { kind: 'goal';  date: string; data: Goal };

type StatPeriod = 'day' | 'week' | 'month' | 'year';

export default function CalendarEvents({
  events, todos = [], goals = [], yearlyGoals = [],
  userId, familyId, scope, onRefresh,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [notifyBefore, setNotifyBefore] = useState('15');
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof Notification !== 'undefined') setNotifPermission(Notification.permission);
  }, []);

  const checkNotifications = useCallback(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const now = Date.now();
    events.forEach(ev => {
      if (ev.notified) return;
      const eventMs = new Date(`${ev.date}T${ev.time || '00:00'}`).getTime();
      const notifyAt = eventMs - ev.notifyMinutesBefore * 60 * 1000;
      if (now >= notifyAt && now < eventMs + 60_000) {
        new Notification(ev.title, {
          body: `${ev.time ? `at ${ev.time} — ` : ''}${ev.description || 'Upcoming event'}`,
          icon: '/favicon.ico',
        });
        markEventNotified(ev.id);
        onRefresh();
      }
    });
  }, [events, onRefresh]);

  useEffect(() => {
    checkNotifications();
    const timer = setInterval(checkNotifications, 60_000);
    return () => clearInterval(timer);
  }, [checkNotifications]);

  async function requestPermission() {
    const result = await Notification.requestPermission();
    setNotifPermission(result);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) return;
    addCalendarEvent({
      title: title.trim(), date, time, description, scope, userId, familyId,
      notifyMinutesBefore: parseInt(notifyBefore) || 15,
    });
    setTitle(''); setDate(''); setTime(''); setDescription(''); setNotifyBefore('15');
    setShowForm(false);
    onRefresh();
  }

  // Build unified agenda
  const today = new Date().toISOString().split('T')[0];
  const agendaItems: AgendaItem[] = [
    ...events.map(ev => ({ kind: 'event' as const, date: ev.date, data: ev })),
    ...todos.map(td => ({ kind: 'todo' as const, date: td.date, data: td })),
    ...goals
      .filter(g => g.day && g.weekNumber !== undefined)
      .map(g => ({ kind: 'goal' as const, date: goalDayToISO(g.weekNumber!, g.year, g.day!), data: g })),
  ];
  agendaItems.sort((a, b) => a.date.localeCompare(b.date));

  const upcoming = agendaItems.filter(i => i.date >= today);
  const past     = agendaItems.filter(i => i.date <  today);

  function groupByDate(items: AgendaItem[]): Map<string, AgendaItem[]> {
    const map = new Map<string, AgendaItem[]>();
    for (const item of items) {
      const arr = map.get(item.date) ?? [];
      arr.push(item);
      map.set(item.date, arr);
    }
    return map;
  }

  const upcomingGroups = groupByDate(upcoming);
  const pastGroups     = groupByDate(past);

  function formatGroupDate(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00');
    if (dateStr === today) return 'Today';
    const tom = new Date(); tom.setDate(tom.getDate() + 1);
    if (dateStr === tom.toISOString().split('T')[0]) return 'Tomorrow';
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }

  return (
    <div className="space-y-6">
      {/* ── Stats Panel ── */}
      <StatsPanel todos={todos} weeklyGoals={goals} yearlyGoals={yearlyGoals} today={today} />

      {notifPermission !== 'granted' && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="text-xl">🔔</span>
          <p className="flex-1 text-sm text-amber-800">Enable notifications to get event reminders</p>
          <button onClick={requestPermission} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition">
            Enable
          </button>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #991b1b, #7f1d1d)' }}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 16 16">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Add Event
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-red-100 bg-red-50 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-red-900">New Event</h3>
          <input
            required value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Event title"
            className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Date</label>
              <input required type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-600">Time (optional)</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
            </div>
          </div>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" rows={2}
            className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm text-stone-800 outline-none resize-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-600">Notify before</label>
            <select value={notifyBefore} onChange={e => setNotifyBefore(e.target.value)}
              className="w-full rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-red-400"
            >
              <option value="5">5 minutes</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="1440">1 day</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 transition">Cancel</button>
            <button type="submit" className="rounded-xl px-4 py-2 text-sm font-medium text-white transition active:scale-95" style={{ background: 'linear-gradient(135deg, #991b1b, #7f1d1d)' }}>Save</button>
          </div>
        </form>
      )}

      {/* Legend */}
      {agendaItems.length > 0 && (
        <div className="flex flex-wrap gap-3 text-xs text-stone-500">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500 inline-block" />Event</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-400 inline-block" />Daily Task</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />Weekly Goal</span>
        </div>
      )}

      {upcomingGroups.size > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Upcoming</h3>
          {[...upcomingGroups.entries()].map(([dateStr, items]) => (
            <DayGroup key={dateStr} dateStr={dateStr} label={formatGroupDate(dateStr)} items={items} isToday={dateStr === today} onRefresh={onRefresh} />
          ))}
        </div>
      )}

      {pastGroups.size > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Past</h3>
          {[...pastGroups.entries()].reverse().map(([dateStr, items]) => (
            <DayGroup key={dateStr} dateStr={dateStr} label={formatGroupDate(dateStr)} items={items} isToday={false} past onRefresh={onRefresh} />
          ))}
        </div>
      )}

      {agendaItems.length === 0 && !showForm && (
        <div className="flex flex-col items-center py-10 text-stone-400">
          <span className="mb-2 text-4xl opacity-30">📅</span>
          <p className="text-sm">No items — add an event or create tasks and goals</p>
        </div>
      )}
    </div>
  );
}

// ── Stats Panel ────────────────────────────────────────────────────────────────

function StatsPanel({ todos, weeklyGoals, yearlyGoals, today }: {
  todos: TodoItem[];
  weeklyGoals: Goal[];
  yearlyGoals: Goal[];
  today: string;
}) {
  const [active, setActive] = useState<StatPeriod>('week');
  const now = new Date();
  const currentWeek  = getWeekNumber(now);
  const currentYear  = getYear(now);
  const currentMonth = now.getMonth();

  function inWeek(dateStr: string) {
    const d = new Date(dateStr + 'T12:00:00');
    return getWeekNumber(d) === currentWeek && d.getFullYear() === currentYear;
  }
  function inMonth(dateStr: string) {
    const d = new Date(dateStr + 'T12:00:00');
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }
  function inYear(dateStr: string) {
    return new Date(dateStr + 'T12:00:00').getFullYear() === currentYear;
  }

  // Map weekly goals to ISO dates for month/day filtering
  const weeklyWithDate = weeklyGoals
    .filter(g => g.day && g.weekNumber !== undefined)
    .map(g => ({ goal: g, iso: goalDayToISO(g.weekNumber!, g.year, g.day!) }));

  const periods: { key: StatPeriod; label: string; icon: string; todos: TodoItem[]; goals: Goal[] }[] = [
    {
      key: 'day', label: 'Today', icon: '☀️',
      todos: todos.filter(t => t.date === today),
      goals: weeklyWithDate.filter(g => g.iso === today).map(g => g.goal),
    },
    {
      key: 'week', label: 'This Week', icon: '📆',
      todos: todos.filter(t => inWeek(t.date)),
      goals: weeklyGoals.filter(g => g.weekNumber === currentWeek && g.year === currentYear),
    },
    {
      key: 'month', label: 'This Month', icon: '🗓️',
      todos: todos.filter(t => inMonth(t.date)),
      goals: weeklyWithDate.filter(g => inMonth(g.iso)).map(g => g.goal),
    },
    {
      key: 'year', label: 'This Year', icon: '📊',
      todos: todos.filter(t => inYear(t.date)),
      goals: [
        ...weeklyGoals.filter(g => g.year === currentYear),
        ...yearlyGoals.filter(g => g.year === currentYear),
      ],
    },
  ];

  const selected = periods.find(p => p.key === active)!;
  const selTodos  = selected.todos;
  const selGoals  = selected.goals;
  const totalTasks = selTodos.length;
  const doneTasks  = selTodos.filter(t => t.completed).length;
  const pendingTasks = totalTasks - doneTasks;
  const totalGoals = selGoals.length;
  const doneGoals  = selGoals.filter(g => g.completed).length;
  const pendingGoals = totalGoals - doneGoals;
  const grandTotal   = totalTasks + totalGoals;
  const grandDone    = doneTasks + doneGoals;
  const grandPending = grandTotal - grandDone;
  const pct = grandTotal === 0 ? 0 : Math.round((grandDone / grandTotal) * 100);

  const progressColor = pct >= 75 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <div className="rounded-2xl border border-stone-100 bg-white shadow-sm overflow-hidden">
      {/* Period tabs */}
      <div className="flex border-b border-stone-100">
        {periods.map(p => (
          <button
            key={p.key}
            onClick={() => setActive(p.key)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-3 text-xs font-medium transition ${
              active === p.key
                ? 'border-b-2 border-red-600 text-red-700 bg-red-50/50'
                : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
            }`}
          >
            <span className="text-base">{p.icon}</span>
            <span className="hidden sm:block">{p.label}</span>
            <span className="sm:hidden capitalize">{p.key}</span>
          </button>
        ))}
      </div>

      {/* Stats body */}
      <div className="p-5">
        {grandTotal === 0 ? (
          <p className="text-center text-sm text-stone-400 py-4">No tasks or goals for this period</p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-5 items-center">
            {/* Circle progress */}
            <div className="relative flex-shrink-0 flex items-center justify-center">
              <svg width="96" height="96" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="40" fill="none" stroke="#f3f4f6" strokeWidth="10" />
                <circle
                  cx="48" cy="48" r="40" fill="none"
                  stroke={progressColor} strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - pct / 100)}`}
                  transform="rotate(-90 48 48)"
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-xl font-bold text-stone-800">{pct}%</span>
                <span className="text-[10px] text-stone-400 font-medium">done</span>
              </div>
            </div>

            {/* Breakdown */}
            <div className="flex-1 w-full space-y-3">
              {/* Overall */}
              <div>
                <div className="flex justify-between text-xs text-stone-500 mb-1">
                  <span className="font-semibold text-stone-700">Overall</span>
                  <span>{grandDone} done · <span className="text-red-600">{grandPending} pending</span></span>
                </div>
                <div className="h-2 rounded-full bg-stone-100">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${pct}%`, background: progressColor }}
                  />
                </div>
              </div>

              {/* Tasks row */}
              {totalTasks > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 text-stone-500">
                      <span className="h-2 w-2 rounded-full bg-blue-400 inline-block" />
                      Daily Tasks
                    </span>
                    <span className="text-stone-600">
                      <span className="font-semibold text-emerald-600">{doneTasks} done</span>
                      {' · '}
                      <span className="font-semibold text-red-500">{pendingTasks} pending</span>
                      {' · '}
                      {totalTasks} total
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-stone-100">
                    <div className="h-1.5 rounded-full bg-blue-400 transition-all" style={{ width: `${totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100)}%` }} />
                  </div>
                </div>
              )}

              {/* Goals row */}
              {totalGoals > 0 && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 text-stone-500">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                      Goals
                    </span>
                    <span className="text-stone-600">
                      <span className="font-semibold text-emerald-600">{doneGoals} done</span>
                      {' · '}
                      <span className="font-semibold text-red-500">{pendingGoals} pending</span>
                      {' · '}
                      {totalGoals} total
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-stone-100">
                    <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${totalGoals === 0 ? 0 : Math.round((doneGoals / totalGoals) * 100)}%` }} />
                  </div>
                </div>
              )}

              {/* Pill summary */}
              <div className="flex gap-2 pt-1 flex-wrap">
                <span className="rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                  {grandDone} completed
                </span>
                <span className="rounded-full bg-red-50 border border-red-100 px-3 py-1 text-xs font-medium text-red-600">
                  {grandPending} pending
                </span>
                <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
                  {grandTotal} total
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Agenda components ──────────────────────────────────────────────────────────

function DayGroup({ dateStr, label, items, isToday, past, onRefresh }: {
  dateStr: string; label: string; items: AgendaItem[]; isToday: boolean; past?: boolean; onRefresh: () => void;
}) {
  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden ${past ? 'opacity-60' : ''} ${isToday ? 'border-red-200' : 'border-stone-100'}`}>
      <div className={`flex items-center gap-3 px-4 py-2.5 border-b ${isToday ? 'border-red-100 bg-red-50' : 'border-stone-100 bg-stone-50'}`}>
        <div className={`flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-lg ${isToday ? 'bg-red-600 text-white' : 'bg-stone-200 text-stone-700'}`}>
          <p className="text-[9px] font-bold uppercase leading-none">{new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short' })}</p>
          <p className="text-sm font-bold leading-none">{new Date(dateStr + 'T12:00:00').getDate()}</p>
        </div>
        <p className={`text-sm font-semibold ${isToday ? 'text-red-800' : 'text-stone-700'}`}>{label}</p>
      </div>
      <ul className="bg-white divide-y divide-stone-50">
        {items.map((item, idx) => (
          <li key={idx} className="px-4 py-2.5">
            {item.kind === 'event' && <EventRow event={item.data} past={past} onDelete={() => { deleteCalendarEvent(item.data.id); onRefresh(); }} />}
            {item.kind === 'todo'  && <TodoRow  todo={item.data}  past={past} onToggle={() => { toggleTodo(item.data.id);  onRefresh(); }} />}
            {item.kind === 'goal'  && <GoalRow  goal={item.data}  past={past} onToggle={() => { toggleGoal(item.data.id);  onRefresh(); }} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EventRow({ event, past, onDelete }: { event: CalendarEvent; past?: boolean; onDelete: () => void }) {
  return (
    <div className="group flex items-center gap-3">
      <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-stone-800 truncate">{event.title}</p>
        {event.time && <p className="text-xs text-stone-500">{event.time}</p>}
        {event.description && <p className="text-xs text-stone-400 truncate">{event.description}</p>}
      </div>
      <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">Event</span>
      {!past && (
        <button onClick={onDelete} className="hidden shrink-0 text-stone-300 hover:text-red-400 group-hover:block transition">
          <svg className="h-3.5 w-3.5" viewBox="0 0 12 12" fill="none">
            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

function TodoRow({ todo, past, onToggle }: { todo: TodoItem; past?: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <input type="checkbox" checked={todo.completed} onChange={onToggle} disabled={!!past}
        className="h-4 w-4 shrink-0 cursor-pointer rounded accent-blue-500" />
      <p className={`flex-1 text-sm truncate ${todo.completed ? 'line-through text-stone-400' : 'text-stone-700'}`}>{todo.text}</p>
      <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">Task</span>
    </div>
  );
}

function GoalRow({ goal, past, onToggle }: { goal: Goal; past?: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <input type="checkbox" checked={goal.completed} onChange={onToggle} disabled={!!past}
        className="h-4 w-4 shrink-0 cursor-pointer rounded accent-emerald-500" />
      <p className={`flex-1 text-sm truncate ${goal.completed ? 'line-through text-stone-400' : 'text-stone-700'}`}>{goal.text}</p>
      <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">Goal</span>
    </div>
  );
}
