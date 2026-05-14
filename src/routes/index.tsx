import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, CheckCircle2, Circle, ListTodo, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

function TodoPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

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

  const remaining = tasks.filter((t) => !t.completed).length;

  return (
    <main className="app-bg min-h-screen px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-xl">
        <header className="mb-8 text-center">
          <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl brand-gradient shadow-[var(--shadow-soft)]">
            <ListTodo className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Your <span className="brand-gradient-text">to-do</span> list
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Stay focused. Capture what matters, ship it, repeat.
          </p>
        </header>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
          <form onSubmit={addTask} className="flex gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="h-11 flex-1"
              maxLength={200}
              disabled={adding}
            />
            <Button
              type="submit"
              disabled={adding || !title.trim()}
              className="h-11 brand-gradient text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span className="ml-1 hidden sm:inline">Add Task</span>
            </Button>
          </form>

          <div className="mt-5 flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {remaining} {remaining === 1 ? "task" : "tasks"} left
            </span>
            <div className="flex gap-1 rounded-lg bg-secondary p-1">
              {(["all", "active", "completed"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium capitalize transition-all",
                    filter === f
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <ul className="mt-4 space-y-2">
            {loading ? (
              <li className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading…
              </li>
            ) : filtered.length === 0 ? (
              <li className="py-12 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                  <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {filter === "completed"
                    ? "Nothing completed yet"
                    : filter === "active"
                      ? "All clear!"
                      : "No tasks yet"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {filter === "all" ? "Add your first task above." : "Switch filters to see more."}
                </p>
              </li>
            ) : (
              filtered.map((task) => (
                <li
                  key={task.id}
                  className="task-enter group flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-3 transition-all hover:border-primary/30 hover:shadow-sm"
                >
                  <button
                    onClick={() => toggleTask(task)}
                    aria-label={task.completed ? "Mark active" : "Mark completed"}
                    className="shrink-0 transition-transform hover:scale-110"
                  >
                    {task.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  <span
                    className={cn(
                      "flex-1 text-sm transition-all break-words",
                      task.completed && "line-through opacity-50"
                    )}
                  >
                    {task.title}
                  </span>
                  <button
                    onClick={() => deleteTask(task.id)}
                    aria-label="Delete task"
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>

        <footer className="mt-6 text-center text-xs text-muted-foreground">
          Built with Lovable Cloud · Data persists across sessions
        </footer>
      </div>
    </main>
  );
}
