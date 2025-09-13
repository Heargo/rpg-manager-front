import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { AuthentificationBusiness } from '../../business/authentification.business';

@Component({
  standalone: true,
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss'],
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    FloatLabelModule,
    InputTextModule,
    FormsModule,
    MessageModule,
  ],
})
export class LoginPageComponent implements OnInit {
  loginForm!: FormGroup;
  errorMessage: string = '';
  errorInForm: boolean = false;

  private readonly authBusiness: AuthentificationBusiness = inject(
    AuthentificationBusiness
  );

  constructor(private formBuilder: FormBuilder, private router: Router) {}

  async onSubmitForm() {
    const loggedIn = await this.authBusiness.login(
      this.loginForm.value.login,
      this.loginForm.value.password
    );
    if (loggedIn) {
      this.router.navigate(['/']);
    } else {
      this.errorInForm = true;
      this.errorMessage = 'Invalid credentials';
    }
  }

  ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      login: [null, [Validators.required]],
      password: [null, [Validators.required, Validators.minLength(8)]],
    });
  }
}
