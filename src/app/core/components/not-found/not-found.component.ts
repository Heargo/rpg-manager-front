import { Component, ChangeDetectionStrategy } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'app-not-found',
  imports: [TranslatePipe],
  templateUrl: './not-found.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./not-found.component.scss'],
})
export class NotFoundComponent {}
