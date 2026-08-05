import type { ReminderTask } from "../shared/types";
import { Scheduler } from "./Scheduler";

/** Scheduler specialization that notifies (and speaks) when a task is due. */
export class ReminderEngine extends Scheduler {
  private speak: ((text: string) => void) | null = null;

  bindVoice(speak: (text: string) => void) {
    this.speak = speak;
  }

  create(title: string, minutes: number): ReminderTask {
    return this.schedule(title, minutes);
  }

  protected onDue(task: ReminderTask) {
    task.done = true;
    const message = `تذكير: ${task.title}`;
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("نيكو", { body: message });
    }
    this.speak?.(message);
  }
}

export const reminderEngine = new ReminderEngine();
