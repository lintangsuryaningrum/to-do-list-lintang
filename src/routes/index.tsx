import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  ClipboardList,
  Loader2,
  Menu,
  Home,
  Calendar as CalendarIcon,
  FileText,
  User,
  Check,
  Bell,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { format, isSameDay, isToday, isPast } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const Route = createFileRoute("/")({
  component: TodoPage,
});

type Task = {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
  due_date: string | null;
};

type Filter = "all" | "active" | "completed";

const FILTER_LABELS: Record<Filter, string> = {
  all: "My tasks",
  active: "Active",
  completed: "Done",
};

function TodoPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [filter, setFilter] = useState<Filter>("all");
  const [showInput, setShowInput] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | undefined>();

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load tasks");
    else setTasks((data ?? []) as Task[]);
    setLoading(false);
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    setAdding(true);
    const { data, error } = await supabase
      .from("tasks")
      .insert({ title: value, due_date: dueDate ? dueDate.toISOString() : null })
      .select()
      .single();
    setAdding(false);
    if (error || !data) {
      toast.error("Could not add task");
      return;
    }
    setTasks((t) => [data as Task, ...t]);
    setTitle("");
    setDueDate(undefined);
    setShowInput(false);
    toast.success("Task added");
  }

  async function toggleTask(task: Task) {
    const next = !task.completed;
    setTasks((t) => t.map((x) => (x.id === task.id ? { ...x, completed: next } : x)));
    const { error } = await supabase
      .from("tasks")
      .update({ completed: next })
      .eq("id", task.id);
    if (error) {
      setTasks((t) => t.map((x) => (x.id === task.id ? { ...x, completed: !next } : x)));
      toast.error("Could not update task");
    }
  }

  async function deleteTask(id: string) {
    const prev = tasks;
    setTasks((t) => t.filter((x) => x.id !== id));
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) {
      setTasks(prev);
      toast.error("Could not delete task");
    } else {
      toast.success("Task removed");
    }
  }

  const filtered = useMemo(() => {
    let list = tasks;
    if (filter === "active") list = list.filter((t) => !t.completed);
    if (filter === "completed") list = list.filter((t) => t.completed);
    if (selectedDay) {
      list = list.filter(
        (t) => t.due_date && isSameDay(new Date(t.due_date), selectedDay)
      );
    }
    return list;
  }, [tasks, filter, selectedDay]);

  const totalCount = tasks.length;
  const doneCount = tasks.filter((t) => t.completed).length;
  const progress = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  const datesWithTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.due_date)
        .map((t) => new Date(t.due_date as string)),
    [tasks]
  );

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  return (
    <main className="min-h-screen bg-background pb-24 lg:pb-10">
      <div className="mx-auto flex w-full max-w-md gap-8 lg:max-w-6xl lg:px-8 lg:pt-8">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:w-20 lg:shrink-0 lg:flex-col lg:items-center lg:gap-6 lg:rounded-3xl lg:bg-card lg:py-6 lg:shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl brand-gradient text-sm font-bold text-primary-foreground shadow-[var(--shadow-soft)]">
            J
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {[Home, CalendarIcon, FileText, User].map((Icon, i) => (
              <button
                key={i}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-2xl transition-colors",
                  i === 0
                    ? "bg-secondary text-primary"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
              </button>
            ))}
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Top bar — mobile only */}
          <header className="flex items-center justify-between px-6 pt-8 lg:hidden">
            <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-sm">
              <Menu className="h-4 w-4 text-foreground" />
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-full brand-gradient text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)]">
              J
            </div>
          </header>

          {/* Greeting */}
          <section className="px-6 pt-6 lg:px-0 lg:pt-0">
            <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
              Hello, <span className="brand-gradient-text">John!</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Have a nice day, {dateStr}
            </p>
          </section>

          {/* Filter chips */}
          <section className="mt-6 flex items-center gap-2 overflow-x-auto px-6 pb-1 lg:px-0">
            {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "shrink-0 rounded-full px-5 py-2 text-xs font-semibold transition-all",
                  filter === f
                    ? "brand-gradient text-primary-foreground shadow-[var(--shadow-soft)]"
                    : "bg-card text-foreground/70 hover:text-foreground"
                )}
              >
                {FILTER_LABELS[f]}
              </button>
            ))}
            {selectedDay && (
              <button
                onClick={() => setSelectedDay(undefined)}
                className="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-secondary px-3 py-2 text-xs font-medium text-primary"
              >
                {format(selectedDay, "MMM d")}
                <X className="h-3 w-3" />
              </button>
            )}
          </section>

          {/* Main two-column layout on desktop */}
          <div className="lg:mt-6 lg:grid lg:grid-cols-5 lg:gap-6">
            {/* Left column: progress + calendar */}
            <div className="mt-5 px-6 lg:col-span-2 lg:mt-0 lg:px-0">
              <ProgressCard
                done={doneCount}
                total={totalCount}
                progress={progress}
              />
              <CalendarCard
                datesWithTasks={datesWithTasks}
                selected={selectedDay}
                onSelect={setSelectedDay}
              />
            </div>

            {/* Right column: tasks */}
            <section className="mt-7 px-6 lg:col-span-3 lg:mt-0 lg:px-0">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold lg:text-lg">
                  {selectedDay ? format(selectedDay, "EEEE, MMM d") : "Progress"}
                </h2>
                <button
                  onClick={() => setShowInput((s) => !s)}
                  className="flex h-9 items-center gap-1.5 rounded-full brand-gradient px-3.5 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-soft)] transition-transform active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Task
                </button>
              </div>

              {/* Inline add form */}
              {showInput && (
                <form
                  onSubmit={addTask}
                  className="task-enter mb-3 space-y-2 rounded-2xl border border-border bg-card p-3 shadow-sm"
                >
                  <input
                    autoFocus
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What's on your mind?"
                    maxLength={200}
                    disabled={adding}
                    className="w-full bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                            dueDate
                              ? "bg-secondary text-primary"
                              : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Bell className="h-3.5 w-3.5" />
                          {dueDate ? format(dueDate, "MMM d") : "Set reminder"}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dueDate}
                          onSelect={setDueDate}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>

                    <div className="flex gap-1">
                      {dueDate && (
                        <button
                          type="button"
                          onClick={() => setDueDate(undefined)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:text-foreground"
                          aria-label="Clear date"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={adding || !title.trim()}
                        className="flex h-9 items-center gap-1.5 rounded-xl brand-gradient px-4 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                      >
                        {adding ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        Add
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Task list */}
              <ul className="space-y-3">
                {loading ? (
                  <li className="flex items-center justify-center rounded-2xl bg-card py-10 text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading…
                  </li>
                ) : filtered.length === 0 ? (
                  <EmptyState filter={filter} hasDayFilter={!!selectedDay} />
                ) : (
                  filtered.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggle={() => toggleTask(task)}
                      onDelete={() => deleteTask(task.id)}
                    />
                  ))
                )}
              </ul>
            </section>
          </div>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-1/2 flex w-full max-w-md -translate-x-1/2 items-center justify-around border-t border-border/60 bg-card/95 px-6 py-3 backdrop-blur lg:hidden">
        {[Home, CalendarIcon, FileText, User].map((Icon, i) => (
          <button
            key={i}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
              i === 0 ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
          </button>
        ))}
      </nav>
    </main>
  );
}

function ProgressCard({
  done,
  total,
  progress,
}: {
  done: number;
  total: number;
  progress: number;
}) {
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (progress / 100) * circ;

  return (
    <div className="relative overflow-hidden rounded-3xl brand-gradient p-5 text-primary-foreground shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r={radius}
              strokeWidth="10"
              stroke="currentColor"
              fill="none"
              className="opacity-20"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              strokeWidth="10"
              stroke="currentColor"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              className="transition-[stroke-dashoffset] duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-xl font-bold">
            {progress}%
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-primary-foreground/80">
            Today's progress
          </p>
          <p className="mt-1 text-2xl font-bold leading-tight">
            {done} <span className="text-primary-foreground/70">/ {total}</span>
          </p>
          <p className="mt-1 text-xs text-primary-foreground/80">
            {total === 0
              ? "No tasks yet"
              : progress === 100
                ? "All done — nice work!"
                : `${total - done} task${total - done === 1 ? "" : "s"} to go`}
          </p>
        </div>
      </div>
    </div>
  );
}

function CalendarCard({
  datesWithTasks,
  selected,
  onSelect,
}: {
  datesWithTasks: Date[];
  selected: Date | undefined;
  onSelect: (d: Date | undefined) => void;
}) {
  return (
    <div className="mt-3 rounded-3xl bg-card p-3 shadow-sm">
      <div className="flex items-center justify-between px-2 pt-1 pb-2">
        <h3 className="text-sm font-bold">Calendar</h3>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full brand-gradient" />
          Has reminder
        </span>
      </div>
      <Calendar
        mode="single"
        selected={selected}
        onSelect={onSelect}
        modifiers={{ hasTask: datesWithTasks }}
        modifiersClassNames={{
          hasTask:
            "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary",
        }}
        className={cn("p-2 pointer-events-auto")}
      />
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const due = task.due_date ? new Date(task.due_date) : null;
  const overdue = due && !task.completed && isPast(due) && !isToday(due);

  return (
    <li className="task-enter group flex items-center gap-3 rounded-2xl bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
      <button
        onClick={onToggle}
        aria-label={task.completed ? "Mark active" : "Mark completed"}
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-all",
          task.completed
            ? "bg-secondary text-primary"
            : "brand-gradient text-primary-foreground shadow-[var(--shadow-soft)]"
        )}
      >
        {task.completed ? <Check className="h-5 w-5" /> : <ClipboardList className="h-5 w-5" />}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-semibold",
            task.completed && "text-muted-foreground line-through"
          )}
        >
          {task.title}
        </p>
        <div className="mt-0.5 flex items-center gap-2 text-xs">
          {due ? (
            <span
              className={cn(
                "flex items-center gap-1 font-medium",
                overdue
                  ? "text-destructive"
                  : isToday(due)
                    ? "text-primary"
                    : "text-muted-foreground"
              )}
            >
              <Bell className="h-3 w-3" />
              {isToday(due) ? "Today" : format(due, "MMM d, yyyy")}
            </span>
          ) : (
            <span className="text-muted-foreground">No reminder</span>
          )}
        </div>
      </div>
      <button
        onClick={onDelete}
        aria-label="Delete task"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

function EmptyState({
  filter,
  hasDayFilter,
}: {
  filter: Filter;
  hasDayFilter: boolean;
}) {
  const message = hasDayFilter
    ? "No tasks for this day"
    : filter === "completed"
      ? "Nothing completed yet"
      : filter === "active"
        ? "All caught up!"
        : "No tasks yet";
  return (
    <li className="flex flex-col items-center justify-center rounded-2xl bg-card py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
        <ClipboardList className="h-6 w-6 text-primary" />
      </div>
      <p className="mt-3 text-sm font-semibold">{message}</p>
      <p className="mt-1 text-xs text-muted-foreground">Tap "Add Task" to get started.</p>
    </li>
  );
}
