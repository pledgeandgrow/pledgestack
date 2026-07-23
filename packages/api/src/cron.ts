export interface CronJob {
  name: string;
  schedule: string;
  handler: () => Promise<void>;
  enabled?: boolean;
}

export interface CronOptions {
  /** Auto-start on register (default: true) */
  autoStart?: boolean;
  /** Timezone (default: 'UTC') */
  timezone?: string;
}

export class CronScheduler {
  private jobs = new Map<string, { job: CronJob; timer: ReturnType<typeof setInterval> | null }>();
  private autoStart: boolean;

  constructor(options: CronOptions = {}) {
    this.autoStart = options.autoStart ?? true;
  }

  register(job: CronJob): void {
    if (this.jobs.has(job.name)) {
      throw new Error(`Cron job "${job.name}" already registered`);
    }

    const entry = { job, timer: null as ReturnType<typeof setInterval> | null };
    this.jobs.set(job.name, entry);

    if (this.autoStart && job.enabled !== false) {
      this.start(job.name);
    }
  }

  start(name: string): void {
    const entry = this.jobs.get(name);
    if (!entry || entry.timer) return;

    const intervalMs = this.parseSchedule(entry.job.schedule);
    entry.timer = setInterval(async () => {
      try {
        await entry.job.handler();
      } catch (err) {
        console.error(`[pledgestack] Cron job "${name}" failed:`, err);
      }
    }, intervalMs);
  }

  stop(name: string): void {
    const entry = this.jobs.get(name);
    if (!entry || !entry.timer) return;
    clearInterval(entry.timer);
    entry.timer = null;
  }

  stopAll(): void {
    for (const name of this.jobs.keys()) {
      this.stop(name);
    }
  }

  list(): Array<{ name: string; schedule: string; running: boolean }> {
    return Array.from(this.jobs.entries()).map(([name, entry]) => ({
      name,
      schedule: entry.job.schedule,
      running: entry.timer !== null,
    }));
  }

  private parseSchedule(schedule: string): number {
    const match = schedule.match(/^every-(\d+)-(seconds?|minutes?|hours?|days?)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (isNaN(n) || n <= 0) throw new Error(`Invalid cron schedule: ${schedule}. N must be a positive integer`);
      const unit = match[2].toLowerCase();
      const multiplier = unit.startsWith('second') ? 1000
        : unit.startsWith('minute') ? 60 * 1000
        : unit.startsWith('hour') ? 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;
      return n * multiplier;
    }
    throw new Error(`Invalid cron schedule: ${schedule}. Use format: every-N-seconds|minutes|hours|days`);
  }
}
