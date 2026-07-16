export interface Job<T = unknown> {
  id: string;
  data: T;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
}

export interface JobOptions {
  maxAttempts?: number;
  delay?: number;
}

export interface JobResult<T = unknown> {
  id: string;
  status: 'completed' | 'failed';
  result?: T;
  error?: string;
}

export class JobQueue<T = unknown> {
  private jobs = new Map<string, Job<T>>();
  private handler: ((job: Job<T>) => Promise<unknown>) | null = null;
  private processing = false;

  constructor(private concurrency = 1) {}

  setHandler(handler: (job: Job<T>) => Promise<unknown>): void {
    this.handler = handler;
  }

  async add(data: T, options: JobOptions = {}): Promise<string> {
    const id = `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
    const job: Job<T> = {
      id,
      data,
      attempts: 0,
      maxAttempts: options.maxAttempts ?? 3,
      createdAt: Date.now(),
      status: 'pending',
    };
    this.jobs.set(id, job);

    if (options.delay) {
      setTimeout(() => this.process(), options.delay);
    } else {
      this.process();
    }

    return id;
  }

  get(id: string): Job<T> | undefined {
    return this.jobs.get(id);
  }

  getStatus(id: string): Job<T>['status'] | undefined {
    return this.jobs.get(id)?.status;
  }

  private async process(): Promise<void> {
    if (this.processing || !this.handler) return;
    this.processing = true;

    try {
      const pending = Array.from(this.jobs.values()).filter((j) => j.status === 'pending');
      const batch = pending.slice(0, this.concurrency);

      await Promise.all(batch.map(async (job) => {
        job.status = 'processing';
        job.attempts++;

        try {
          const result = await this.handler!(job);
          job.status = 'completed';
          job.result = result;
        } catch (err) {
          if (job.attempts >= job.maxAttempts) {
            job.status = 'failed';
            job.error = err instanceof Error ? err.message : String(err);
          } else {
            job.status = 'pending';
          }
        }
      }));
    } finally {
      this.processing = false;
    }

    const stillPending = Array.from(this.jobs.values()).some((j) => j.status === 'pending');
    if (stillPending) {
      this.process();
    }
  }

  stats(): { pending: number; processing: number; completed: number; failed: number } {
    let pending = 0, processing = 0, completed = 0, failed = 0;
    for (const job of this.jobs.values()) {
      if (job.status === 'pending') pending++;
      else if (job.status === 'processing') processing++;
      else if (job.status === 'completed') completed++;
      else if (job.status === 'failed') failed++;
    }
    return { pending, processing, completed, failed };
  }
}
