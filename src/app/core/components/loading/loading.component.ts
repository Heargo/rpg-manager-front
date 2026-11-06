import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-loading',
  templateUrl: './loading.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./loading.component.scss'],
})
export class LoadingComponent {}
