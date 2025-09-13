import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  standalone: true,
  selector: 'app-profile-page',
  templateUrl: './profile-page.component.html',
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
