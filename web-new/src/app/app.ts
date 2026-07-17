import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { DensityService } from './core/density/density.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private readonly auth = inject(AuthService);
  /** Eagerly construct so density class is applied. */
  private readonly _density = inject(DensityService);

  readonly ready = this.auth.ready;

  ngOnInit(): void {
    void this.auth.bootstrap();
  }
}
