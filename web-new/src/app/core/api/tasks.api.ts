import { Injectable, inject } from '@angular/core';
import { ListApi, ListQuery } from './list.api';
import { TaskSummary, TasksBatch } from '../protocol/resource.types';

@Injectable({ providedIn: 'root' })
export class TasksApi {
  private readonly lists = inject(ListApi);

  list(query: ListQuery = {}) {
    return this.lists.listBatch<TasksBatch, TaskSummary>({
      what: 'tasks.list',
      where: 'tasks_view',
      batchKind: 'tasks.batch',
      itemKind: 'task',
      query,
      emptyBatch: {
        total: 0,
        shown: 0,
        stats: { running: 0, queued: 0, failed: 0 },
      },
    });
  }
}
