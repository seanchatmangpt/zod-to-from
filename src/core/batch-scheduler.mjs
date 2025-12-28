/**
 * Batch Scheduler - Queue management and resource optimization for batch operations
 * @fileoverview Advanced scheduling, priority queues, and resource pooling for batch processing
 */

import { EventEmitter } from 'node:events';
import { BatchProcessor } from './batch.mjs';

/**
 * @typedef {import('zod').ZodSchema} ZodSchema
 */

/**
 * @typedef {Object} ScheduledTask
 * @property {string} id - Task identifier
 * @property {BatchProcessor} processor - Batch processor instance
 * @property {number} priority - Task priority (higher = more important)
 * @property {Date} createdAt - Task creation time
 * @property {Date} [scheduledAt] - When task was scheduled for execution
 * @property {Date} [startedAt] - When task execution started
 * @property {Date} [completedAt] - When task execution completed
 * @property {string} status - Task status: 'pending', 'scheduled', 'running', 'completed', 'failed'
 * @property {any} [result] - Task execution result
 * @property {Error} [error] - Task execution error
 * @property {Object} [metadata] - Additional task metadata
 */

/**
 * @typedef {Object} SchedulerOptions
 * @property {number} [maxConcurrent] - Maximum concurrent batch operations (default: 2)
 * @property {number} [maxQueueSize] - Maximum queue size (default: 100)
 * @property {number} [maxMemoryMB] - Maximum total memory usage in MB
 * @property {boolean} [autoPrioritize] - Auto-adjust priorities based on task characteristics
 * @property {number} [priorityBoostInterval] - Boost priority of waiting tasks (ms, default: 30000)
 * @property {boolean} [enableResourcePool] - Use resource pooling (default: true)
 * @property {function(ScheduledTask): number} [priorityFunction] - Custom priority calculation
 */

/**
 * @typedef {Object} ResourceStats
 * @property {number} activeTasks - Currently running tasks
 * @property {number} queuedTasks - Tasks waiting in queue
 * @property {number} completedTasks - Completed tasks
 * @property {number} failedTasks - Failed tasks
 * @property {number} averageExecutionTime - Average execution time in ms
 * @property {number} memoryUsageMB - Current memory usage in MB
 * @property {number} queueUtilization - Queue utilization percentage
 */

/**
 * Priority levels for batch tasks
 */
export const Priority = {
  LOW: 1,
  NORMAL: 5,
  HIGH: 10,
  CRITICAL: 20,
};

/**
 * Batch scheduler with queue management and resource optimization
 */
export class BatchScheduler extends EventEmitter {
  /**
   * @param {SchedulerOptions} [options] - Scheduler options
   */
  constructor(options = {}) {
    super();
    this.options = {
      maxConcurrent: 2,
      maxQueueSize: 100,
      autoPrioritize: true,
      priorityBoostInterval: 30_000,
      enableResourcePool: true,
      ...options,
    };

    /** @type {Map<string, ScheduledTask>} */
    this.tasks = new Map();

    /** @type {ScheduledTask[]} */
    this.queue = [];

    /** @type {ScheduledTask[]} */
    this.running = [];

    this.paused = false;

    this.stats = {
      totalScheduled: 0,
      totalCompleted: 0,
      totalFailed: 0,
      totalExecutionTime: 0,
    };

    // Start priority boost timer if enabled
    if (this.options.autoPrioritize && this.options.priorityBoostInterval > 0) {
      this._startPriorityBoost();
    }
  }

  /**
   * Schedule a batch processor for execution
   * @param {BatchProcessor} processor - Batch processor to schedule
   * @param {Object} [options] - Task options
   * @param {number} [options.priority] - Task priority (default: Priority.NORMAL)
   * @param {string} [options.id] - Task ID (auto-generated if not provided)
   * @param {Object} [options.metadata] - Additional metadata
   * @returns {string} Task ID
   */
  schedule(processor, options = {}) {
    const taskId = options.id || `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const priority = options.priority ?? Priority.NORMAL;

    // Check queue size limit
    if (this.queue.length >= this.options.maxQueueSize) {
      throw new Error(
        `Queue is full (max: ${this.options.maxQueueSize}). Cannot schedule more tasks.`
      );
    }

    const task = {
      id: taskId,
      processor,
      priority,
      createdAt: new Date(),
      status: 'pending',
      metadata: options.metadata || {},
    };

    this.tasks.set(taskId, task);
    this.queue.push(task);
    this.stats.totalScheduled++;

    // Sort queue by priority (higher priority first)
    this._sortQueue();

    // Emit scheduled event
    this.emit('taskScheduled', task);

    // Try to process queue
    this._processQueue();

    return taskId;
  }

  /**
   * Schedule multiple batch processors
   * @param {BatchProcessor[]} processors - Array of batch processors
   * @param {Object} [options] - Scheduling options
   * @returns {string[]} Array of task IDs
   */
  scheduleMany(processors, options = {}) {
    return processors.map((processor, index) => {
      return this.schedule(processor, {
        ...options,
        id: options.idPrefix ? `${options.idPrefix}-${index}` : undefined,
      });
    });
  }

  /**
   * Sort queue by priority
   * @private
   */
  _sortQueue() {
    this.queue.sort((a, b) => {
      // Higher priority first
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      // If same priority, older tasks first (FIFO within same priority)
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  /**
   * Process the queue
   * @private
   */
  async _processQueue() {
    // Don't process if paused
    if (this.paused) {
      return;
    }

    // Check if we can run more tasks
    while (this.running.length < this.options.maxConcurrent && this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) {break;}

      // Update task status
      task.status = 'scheduled';
      task.scheduledAt = new Date();

      // Execute task
      this._executeTask(task);
    }
  }

  /**
   * Execute a scheduled task
   * @param {ScheduledTask} task - Task to execute
   * @private
   */
  async _executeTask(task) {
    // Move to running
    this.running.push(task);
    task.status = 'running';
    task.startedAt = new Date();

    this.emit('taskStarted', task);

    try {
      // Execute the batch processor
      const result = await task.processor.execute();

      // Task completed successfully
      task.status = 'completed';
      task.completedAt = new Date();
      task.result = result;

      this.stats.totalCompleted++;
      this.stats.totalExecutionTime += result.totalDuration;

      this.emit('taskCompleted', task);
    } catch (error) {
      // Task failed
      task.status = 'failed';
      task.completedAt = new Date();
      task.error = error;

      this.stats.totalFailed++;

      this.emit('taskFailed', task);
    } finally {
      // Remove from running
      const index = this.running.indexOf(task);
      if (index !== -1) {
        this.running.splice(index, 1);
      }

      // Process next tasks in queue
      this._processQueue();
    }
  }

  /**
   * Start priority boost timer
   * @private
   */
  _startPriorityBoost() {
    setInterval(() => {
      const now = Date.now();
      const boostInterval = this.options.priorityBoostInterval;

      for (const task of this.queue) {
        const waitTime = now - task.createdAt.getTime();
        if (waitTime > boostInterval) {
          // Boost priority for tasks waiting too long
          const boostAmount = Math.floor(waitTime / boostInterval);
          task.priority += boostAmount;
        }
      }

      // Re-sort queue after priority adjustments
      if (this.queue.length > 0) {
        this._sortQueue();
      }
    }, this.options.priorityBoostInterval);
  }

  /**
   * Get task by ID
   * @param {string} taskId - Task identifier
   * @returns {ScheduledTask|undefined} The task or undefined
   */
  getTask(taskId) {
    return this.tasks.get(taskId);
  }

  /**
   * Cancel a scheduled task
   * @param {string} taskId - Task identifier
   * @returns {boolean} True if task was cancelled
   */
  cancel(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      return false;
    }

    // Can only cancel pending or scheduled tasks
    if (task.status === 'running' || task.status === 'completed' || task.status === 'failed') {
      return false;
    }

    // Remove from queue
    const queueIndex = this.queue.indexOf(task);
    if (queueIndex !== -1) {
      this.queue.splice(queueIndex, 1);
    }

    // Update status
    task.status = 'cancelled';
    task.completedAt = new Date();

    this.emit('taskCancelled', task);

    return true;
  }

  /**
   * Wait for a task to complete
   * @param {string} taskId - Task identifier
   * @returns {Promise<any>} Task result
   */
  async waitFor(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // If already completed, return result
    if (task.status === 'completed') {
      return task.result;
    }

    if (task.status === 'failed') {
      throw task.error;
    }

    // Wait for completion
    return new Promise((resolve, reject) => {
      const onComplete = (completedTask) => {
        if (completedTask.id === taskId) {
          this.off('taskCompleted', onComplete);
          this.off('taskFailed', onFailed);
          resolve(completedTask.result);
        }
      };

      const onFailed = (failedTask) => {
        if (failedTask.id === taskId) {
          this.off('taskCompleted', onComplete);
          this.off('taskFailed', onFailed);
          reject(failedTask.error);
        }
      };

      this.on('taskCompleted', onComplete);
      this.on('taskFailed', onFailed);
    });
  }

  /**
   * Wait for all tasks to complete
   * @returns {Promise<void>}
   */
  async waitForAll() {
    if (this.queue.length === 0 && this.running.length === 0) {
      return;
    }

    return new Promise((resolve) => {
      const checkComplete = () => {
        if (this.queue.length === 0 && this.running.length === 0) {
          this.off('taskCompleted', checkComplete);
          this.off('taskFailed', checkComplete);
          resolve();
        }
      };

      this.on('taskCompleted', checkComplete);
      this.on('taskFailed', checkComplete);
    });
  }

  /**
   * Get current resource statistics
   * @returns {ResourceStats} Resource statistics
   */
  getResourceStats() {
    return {
      activeTasks: this.running.length,
      queuedTasks: this.queue.length,
      completedTasks: this.stats.totalCompleted,
      failedTasks: this.stats.totalFailed,
      averageExecutionTime:
        this.stats.totalCompleted > 0
          ? this.stats.totalExecutionTime / this.stats.totalCompleted
          : 0,
      memoryUsageMB: process.memoryUsage().heapUsed / 1024 / 1024,
      queueUtilization: (this.queue.length / this.options.maxQueueSize) * 100,
    };
  }

  /**
   * Clear completed tasks from memory
   * @param {number} [olderThanMs] - Clear tasks older than this (default: keep all)
   */
  clearCompleted(olderThanMs) {
    const now = Date.now();
    const toRemove = [];

    for (const [id, task] of this.tasks) {
      if (task.status === 'completed' || task.status === 'failed') {
        if (!olderThanMs || !task.completedAt) {
          toRemove.push(id);
        } else if (now - task.completedAt.getTime() > olderThanMs) {
          toRemove.push(id);
        }
      }
    }

    for (const id of toRemove) {
      this.tasks.delete(id);
    }

    return toRemove.length;
  }

  /**
   * Pause the scheduler (stop processing new tasks)
   */
  pause() {
    this.paused = true;
    this.emit('paused');
  }

  /**
   * Resume the scheduler
   */
  resume() {
    this.paused = false;
    this.emit('resumed');
    this._processQueue();
  }

  /**
   * Shutdown the scheduler
   * @param {boolean} [graceful] - Wait for running tasks to complete
   * @returns {Promise<void>}
   */
  async shutdown(graceful = true) {
    this.emit('shutdown');

    // Clear queue
    this.queue = [];

    if (graceful && this.running.length > 0) {
      // Wait for running tasks to complete
      await this.waitForAll();
    } else {
      // Force stop (tasks will fail)
      this.running = [];
    }
  }
}

/**
 * Create a batch scheduler
 * @param {SchedulerOptions} [options] - Scheduler options
 * @returns {BatchScheduler} Scheduler instance
 */
export function createScheduler(options = {}) {
  return new BatchScheduler(options);
}

/**
 * Resource pool for managing shared resources across batches
 */
export class ResourcePool extends EventEmitter {
  /**
   * @param {Object} [options] - Pool options
   * @param {number} [options.maxResources] - Maximum resources in pool
   * @param {function(): Promise<any>} [options.createResource] - Resource factory
   * @param {function(any): Promise<void>} [options.destroyResource] - Resource cleanup
   */
  constructor(options = {}) {
    super();
    this.options = {
      maxResources: 10,
      ...options,
    };

    this.pool = [];
    this.available = [];
    this.inUse = new Set();
  }

  /**
   * Acquire a resource from the pool
   * @returns {Promise<any>} Resource
   */
  async acquire() {
    // Try to get from available pool
    if (this.available.length > 0) {
      const resource = this.available.pop();
      this.inUse.add(resource);
      return resource;
    }

    // Create new resource if under limit
    if (this.pool.length < this.options.maxResources) {
      const resource = this.options.createResource
        ? await this.options.createResource()
        : { id: `resource-${this.pool.length}` };
      this.pool.push(resource);
      this.inUse.add(resource);
      return resource;
    }

    // Wait for resource to become available
    return new Promise((resolve) => {
      const onRelease = () => {
        if (this.available.length > 0) {
          this.off('resourceReleased', onRelease);
          const resource = this.available.pop();
          this.inUse.add(resource);
          resolve(resource);
        }
      };
      this.on('resourceReleased', onRelease);
    });
  }

  /**
   * Release a resource back to the pool
   * @param {any} resource - Resource to release
   */
  release(resource) {
    if (this.inUse.has(resource)) {
      this.inUse.delete(resource);
      this.available.push(resource);
      this.emit('resourceReleased', resource);
    }
  }

  /**
   * Destroy all resources and clear the pool
   * @returns {Promise<void>}
   */
  async destroy() {
    if (this.options.destroyResource) {
      await Promise.all(this.pool.map((r) => this.options.destroyResource(r)));
    }
    this.pool = [];
    this.available = [];
    this.inUse.clear();
  }
}
