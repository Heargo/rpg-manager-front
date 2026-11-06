import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from '@openng/optimus-ui/button';
import { FloatLabelModule } from '@openng/optimus-ui/floatlabel';
import { InputTextModule } from '@openng/optimus-ui/inputtext';
import { MessageModule } from '@openng/optimus-ui/message';
import { TranslocoPipe } from '@jsverse/transloco';
import { LanguageBusiness } from '../../../../core/business/language.business';
import { AuthentificationBusiness } from '../../business/authentification.business';

@Component({
  standalone: true,
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    TranslocoPipe,
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

  private readonly languageBusiness = inject(LanguageBusiness);
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
      this.errorMessage = this.languageBusiness.t('auth.errors.invalidCredentials');
    }
  }

  ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      login: [null, [Validators.required]],
      password: [null, [Validators.required, Validators.minLength(8)]],
    });
  }
}
