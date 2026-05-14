import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  ClipboardList,
  Loader2,
  Menu,
  Home,
  Calendar,
  FileText,
  User,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: TodoPage,
});

type Task = {
  id: string;
  title: string;
  completed: boolean;
  created_at: string;
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
  const [filter, setFilter] = useState<Filter>("all");
  const [showInput, setShowInput] = useState(false);

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
    else setTasks(data ?? []);
    setLoading(false);
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    setAdding(true);
    const { data, error } = await supabase
      .from("tasks")
      .insert({ title: value })
      .select()
      .single();
    setAdding(false);
    if (error || !data) {
      toast.error("Could not add task");
      return;
    }
    setTasks((t) => [data, ...t]);
    setTitle("");
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
    if (filter === "active") return tasks.filter((t) => !t.completed);
    if (filter === "completed") return tasks.filter((t) => t.completed);
    return tasks;
  }, [tasks, filter]);

  const totalCount = tasks.length;
  const doneCount = tasks.filter((t) => t.completed).length;
  const progress = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  return (
    <main className="min-h-screen bg-background pb-24">
      <div className="mx-auto w-full max-w-md">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 pt-8">
          <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-sm">
            <Menu className="h-4 w-4 text-foreground" />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-full brand-gradient text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)]">
            J
          </div>
        </header>

        {/* Greeting */}
        <section className="px-6 pt-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Hello, <span className="brand-gradient-text">John!</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Have a nice day, {dateStr}</p>
        </section>

        {/* Filter chips */}
        <section className="mt-6 flex gap-2 overflow-x-auto px-6 pb-1">
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
        </section>

        {/* Stat cards */}
        <section className="mt-5 grid grid-cols-2 gap-3 px-6">
          <StatCard
            label="In progress"
            count={totalCount - doneCount}
            tint="from"
            progress={totalCount === 0 ? 0 : 100 - progress}
          />
          <StatCard
            label="Completed"
            count={doneCount}
            tint="to"
            progress={progress}
          />
        </section>

        {/* Progress section */}
        <section className="mt-7 px-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold">Progress</h2>
            <button
              onClick={() => setShowInput((s) => !s)}
              className="flex h-9 items-center gap-1.5 rounded-full brand-gradient px-3.5 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-soft)] transition-transform active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Task
            </button>
          </div>

          {/* Inline add input */}
          {showInput && (
            <form
              onSubmit={addTask}
              className="task-enter mb-3 flex gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm"
            >
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's on your mind?"
                maxLength={200}
                disabled={adding}
                className="flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
              />
              <button
                type="submit"
                disabled={adding || !title.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-xl brand-gradient text-primary-foreground disabled:opacity-50"
              >
                {adding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </button>
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
              <EmptyState filter={filter} />
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

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-1/2 flex w-full max-w-md -translate-x-1/2 items-center justify-around border-t border-border/60 bg-card/95 px-6 py-3 backdrop-blur">
        {[Home, Calendar, FileText, User].map((Icon, i) => (
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

function StatCard({
  label,
  count,
  tint,
  progress,
}: {
  label: string;
  count: number;
  tint: "from" | "to";
  progress: number;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-4 shadow-[var(--shadow-soft)]",
        tint === "from" ? "brand-gradient" : "bg-card border border-border shadow-sm"
      )}
    >
      <div
        className={cn(
          "text-[11px] font-medium uppercase tracking-wide",
          tint === "from" ? "text-primary-foreground/80" : "text-muted-foreground"
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-2xl font-bold",
          tint === "from" ? "text-primary-foreground" : "text-foreground"
        )}
      >
        {count}
      </div>
      <div className="mt-4 flex items-center justify-between text-[10px]">
        <span
          className={cn(
            tint === "from" ? "text-primary-foreground/80" : "text-muted-foreground"
          )}
        >
          Progress
        </span>
        <span
          className={cn(
            "font-semibold",
            tint === "from" ? "text-primary-foreground" : "text-primary"
          )}
        >
          {progress}%
        </span>
      </div>
      <div
        className={cn(
          "mt-1.5 h-1 w-full overflow-hidden rounded-full",
          tint === "from" ? "bg-primary-foreground/20" : "bg-secondary"
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            tint === "from" ? "bg-primary-foreground" : "brand-gradient"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
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
  const date = new Date(task.created_at).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

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
        <p className="mt-0.5 text-xs text-muted-foreground">{date}</p>
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

function EmptyState({ filter }: { filter: Filter }) {
  const message =
    filter === "completed"
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
      <p className="mt-1 text-xs text-muted-foreground">Tap “Add Task” to get started.</p>
    </li>
  );
}
