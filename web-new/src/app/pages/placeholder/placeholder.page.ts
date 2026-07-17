import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';

/** Thin spine stub until domain pages land in W5. Title/subtitle from route data. */
@Component({
  selector: 'app-placeholder-page',
  standalone: true,
  imports: [PageHeaderComponent, EmptyStateComponent],
  template: `
    <app-page-header [title]="title()" [subtitle]="subtitle()" />
    <app-empty-state
      title="Coming in a later wave"
      [description]="
        description() ||
        'This surface is on the product spine (catalog §7). Shell routing is wired; domain UI follows.'
      "
    />
  `,
})
export class PlaceholderPage {
  private readonly route = inject(ActivatedRoute);

  private readonly data = toSignal(
    this.route.data.pipe(
      map((d) => ({
        title: (d['title'] as string) || 'Page',
        subtitle: (d['subtitle'] as string) || '',
        description: (d['description'] as string) || '',
      })),
    ),
    {
      initialValue: {
        title: (this.route.snapshot.data['title'] as string) || 'Page',
        subtitle: (this.route.snapshot.data['subtitle'] as string) || '',
        description: (this.route.snapshot.data['description'] as string) || '',
      },
    },
  );

  title = () => this.data().title;
  subtitle = () => this.data().subtitle;
  description = () => this.data().description;
}
