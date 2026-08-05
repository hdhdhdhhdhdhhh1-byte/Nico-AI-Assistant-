import type { ReminderTask } from "../shared/types";

type Listener = (tasks: ReminderTask[]) => void;

/** Generic time-based task store shared by reminders and calendar. */
export class Scheduler {
  protected tasks: ReminderTask[] = [];
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setInterval> | null = null;

  schedule(title: string, minutesFromNow: number): ReminderTask {
    const task: ReminderTask = {
      id: crypto.randomUUID(),
      title: title.trim() || "مهمة",
      dueAt: Date.now() + minutesFromNow * 60_000,
      done: false,
    };
    this.tasks.push(task);
    this.emit();
    return task;
  }

  upcoming(): ReminderTask[] {
    return this.tasks.filter((t) => !t.done).sort((a, b) => a.dueAt - b.dueAt);
  }

  complete(id: string) {
    const t = this.tasks.find((x) => x.id === id);
    if (t) t.done = true;
    this.emit();
  }

  remove(id: string) {
    this.tasks = this.tasks.filter((t) => t.id !== id);
    this.emit();
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    fn(this.upcoming());
    if (!this.timer && typeof window !== "undefined") {
      this.timer = setInterval(() => this.tick(), 15_000);
    }
    return () => {
      this.listeners.delete(fn);
      if (!this.listeners.size && this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    };
  }

  protected tick() {
    const due = this.tasks.filter((t) => !t.done && t.dueAt <= Date.now());
    if (due.length) {
      due.forEach((t) => this.onDue(t));
      this.emit();
    }
  }

  protected onDue(task: ReminderTask) {
    task.done = true;
  }

  protected emit() {
    const snapshot = this.upcoming();
    this.listeners.forEach((l) => l(snapshot));
  }
}

export const scheduler = new Scheduler();
