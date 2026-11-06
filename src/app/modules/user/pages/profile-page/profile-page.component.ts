import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  standalone: true,
  selector: 'app-profile-page',
  imports: [TranslocoPipe],
  templateUrl: './profile-page.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./profile-page.component.scss'],
})
export class ProfilePageComponent implements OnInit {
  login = '';

  constructor(private readonly router: Router) {}

  ngOnInit(): void {}

  logout() {
    this.router.navigate(['auth/login']);
  }
}
