import { useEffect, useRef } from 'react';

type PollTask = {
  key: string;
  run: (signal: AbortSignal) => Promise<void>;
};

type UseSequentialApiPollingOptions = {
  tasks: PollTask[];
  intervalMs?: number;
  timeoutMs?: number;
  enabled?: boolean;
  immediate?: boolean;
  onCycleStart?: (tasks: PollTask[]) => void;
  onCycleEnd?: (tasks: PollTask[]) => void;
};

function timeoutError(taskKey: string, timeoutMs: number) {
  return new Error(`Polling task \"${taskKey}\" timed out after ${timeoutMs}ms`);
}

async function runWithTimeout(task: PollTask, timeoutMs: number, parentSignal?: AbortSignal) {
  const controller = new AbortController();
  const abortTimer = window.setTimeout(() => controller.abort(), timeoutMs);
  let rejectTimer: number | null = null;

  const abortListener = () => controller.abort();
  if (parentSignal) {
    parentSignal.addEventListener('abort', abortListener, { once: true });
  }

  try {
    await Promise.race([
      task.run(controller.signal),
      new Promise<never>((_, reject) => {
        rejectTimer = window.setTimeout(() => reject(timeoutError(task.key, timeoutMs)), timeoutMs);
      }),
    ]);
  } catch (error) {
    if (!controller.signal.aborted) {
      console.error(`[Polling] task failed`, task.key, error);
    }
    throw error;
  } finally {
    window.clearTimeout(abortTimer);
    if (rejectTimer !== null) {
      window.clearTimeout(rejectTimer);
    }
    if (parentSignal) {
      parentSignal.removeEventListener('abort', abortListener);
    }
  }
}

export function useSequentialApiPolling({
  tasks,
  intervalMs = 90_000,
  timeoutMs = 10_000,
  enabled = true,
  immediate = true,
  onCycleStart,
  onCycleEnd,
}: UseSequentialApiPollingOptions) {
  const tasksRef = useRef(tasks);
  const enabledRef = useRef(enabled);
  const intervalRef = useRef(intervalMs);
  const timeoutRef = useRef(timeoutMs);
  const onCycleStartRef = useRef(onCycleStart);
  const onCycleEndRef = useRef(onCycleEnd);
  const runningRef = useRef(false);
  const visibleRef = useRef(typeof document === 'undefined' ? true : document.visibilityState === 'visible');
  const timerRef = useRef<number | null>(null);

  tasksRef.current = tasks;
  enabledRef.current = enabled;
  intervalRef.current = intervalMs;
  timeoutRef.current = timeoutMs;
  onCycleStartRef.current = onCycleStart;
  onCycleEndRef.current = onCycleEnd;

  useEffect(() => {
    const handleVisibilityChange = () => {
      visibleRef.current = document.visibilityState === 'visible';
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (!enabledRef.current || tasksRef.current.length === 0) {
      console.log('[轮询] 未启动', {
        enabled: enabledRef.current,
        taskCount: tasksRef.current.length,
      });
      return;
    }

    let cancelled = false;
    let cycleController: AbortController | null = null;
    let cycleId = 0;

    const scheduleNext = (delay: number) => {
      if (cancelled) return;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        void runCycle();
      }, delay);
    };

    const runCycle = async () => {
      if (cancelled) {
        return;
      }
      if (runningRef.current) {
        console.log('[轮询] 跳过本轮，上一轮仍在执行');
        scheduleNext(intervalRef.current);
        return;
      }
      if (!visibleRef.current) {
        console.log('[轮询] 跳过本轮，页面不可见');
        scheduleNext(intervalRef.current);
        return;
      }

      runningRef.current = true;
      cycleController = new AbortController();
      const currentTasks = tasksRef.current;
      const taskKeys = currentTasks.map((task) => task.key);
      const currentCycleId = ++cycleId;

      console.log(`[轮询] 第 ${currentCycleId} 轮开始，共 ${currentTasks.length} 个任务`, taskKeys);

      try {
        onCycleStartRef.current?.(currentTasks);
        for (const task of currentTasks) {
          if (cancelled || cycleController.signal.aborted) break;
          try {
            await runWithTimeout(task, timeoutRef.current, cycleController.signal);
          } catch {
            // 单个任务失败后继续下一个
          }
        }
      } catch (error) {
        console.error('[轮询] 本轮执行异常', error);
      } finally {
        onCycleEndRef.current?.(currentTasks);
        runningRef.current = false;
        cycleController = null;
        console.log(`[轮询] 第 ${currentCycleId} 轮结束，共 ${currentTasks.length} 个任务`, taskKeys);
        scheduleNext(intervalRef.current);
      }
    };

    console.log('[轮询] 已启动', {
      immediate,
      intervalMs: intervalRef.current,
      timeoutMs: timeoutRef.current,
      taskCount: tasksRef.current.length,
    });

    if (immediate) {
      void runCycle();
    } else {
      scheduleNext(intervalRef.current);
    }

    return () => {
      cancelled = true;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      cycleController?.abort();
      console.log('[轮询] 已停止', {
        taskCount: tasksRef.current.length,
      });
    };
  }, [enabled, immediate, tasks.length]);
}
