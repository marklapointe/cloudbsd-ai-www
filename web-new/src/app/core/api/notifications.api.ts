import { Injectable, inject } from '@angular/core';
import { EnvelopeClient } from '../protocol/envelope.client';
import { firstPayload } from '../protocol/envelope.types';
import { NotificationItem } from '../protocol/resource.types';

export interface NotificationsBatch {
  total: number;
  unread: number;
  items: NotificationItem[];
}

@Injectable({ providedIn: 'root' })
export class NotificationsApi {
  private readonly client = inject(EnvelopeClient);

  async list(): Promise<NotificationsBatch> {
    const env = await this.client.exchange({
      what: 'notifications.list',
      where: 'header_notifications',
    });
    const batch = firstPayload<NotificationsBatch>(env, 'notifications.batch');
    return (
      batch?.data || {
        total: 0,
        unread: 0,
        items: [],
      }
    );
  }
}
