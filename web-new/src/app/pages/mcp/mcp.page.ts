import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import {
  ResourceColumn,
  ResourceTableComponent,
} from '../../shared/resource-table/resource-table.component';
import { EnvelopeClient } from '../../core/protocol/envelope.client';
import { firstPayload } from '../../core/protocol/envelope.types';

interface McpServer {
  id: string;
  name: string;
  transport: 'http' | 'sse' | 'stdio';
  endpoint: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  tools: number;
  lastProbe?: string;
}

@Component({
  selector: 'app-mcp-page',
  standalone: true,
  imports: [PageHeaderComponent, ResourceTableComponent, RouterLink],
  template: `
    <app-page-header
      title="MCP"
      subtitle="Plugin system — register HTTP/SSE/stdio servers, probe, tools (Rule #3)"
    >
      <a
        routerLink="/mcp/add"
        class="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white no-underline hover:bg-brand-600"
      >
        Add MCP server
      </a>
    </app-page-header>

    @if (loading()) {
      <div class="rounded-shell border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Loading MCP registry…
      </div>
    } @else {
      <app-resource-table
        [columns]="columns"
        [rows]="rows()"
        [trackBy]="track"
        emptyTitle="No MCP servers"
        emptyDescription="MCP is the extension model — there is no separate Plugins product."
      />
    }
  `,
})
export class McpPage implements OnInit {
  private readonly client = inject(EnvelopeClient);

  readonly loading = signal(true);
  readonly rows = signal<McpServer[]>([]);

  readonly columns: ResourceColumn<McpServer>[] = [
    { id: 'status', header: 'Status', badge: true, cell: (s) => s.status },
    { id: 'name', header: 'Name', cell: (s) => s.name },
    { id: 'transport', header: 'Transport', cell: (s) => s.transport },
    { id: 'endpoint', header: 'Endpoint', cell: (s) => s.endpoint },
    { id: 'tools', header: 'Tools', cell: (s) => String(s.tools) },
  ];

  readonly track = (s: McpServer) => s.id;

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const env = await this.client.exchange({
        what: 'mcp.list',
        where: 'mcp_view',
      });
      const batch = firstPayload<{ items: McpServer[] }>(env, 'mcp.batch');
      this.rows.set(batch?.data?.items || []);
    } finally {
      this.loading.set(false);
    }
  }
}
