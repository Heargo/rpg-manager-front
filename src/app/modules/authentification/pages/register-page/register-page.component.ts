import { Component, effect, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { passwordMatchValidator } from '../../../../core/validators/password-match.validator';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthentificationBusiness } from '../../business/authentification.business';

@Component({
  standalone: true,
  selector: 'app-register-page',
  templateUrl: './register-page.component.html',
  styleUrls: ['./register-page.component.scss'],
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    FloatLabelModule,
    InputTextModule,
    FormsModule,
    MessageModule,
  ],
})
export class RegisterPageComponent {
  errorMessage: string = '';
  errorInForm: boolean = false;
  signupForm: FormGroup = new FormGroup(
    {
      login: new FormControl<string>('', {
        validators: [Validators.required],
      }),
      password: new FormControl<string>('', {
        validators: [Validators.required, Validators.minLength(8)],
      }),
      passwordVerification: new FormControl<string>('', {
        validators: [Validators.required, Validators.minLength(8)],
      }),
    },
    passwordMatchValidator
  );

  private readonly authBusiness = inject(AuthentificationBusiness);

  private readonly $formChange = toSignal(this.signupForm?.valueChanges);

  constructor(private formBuilder: FormBuilder, private router: Router) {
    effect(() => {
      const changes = this.$formChange();
      if (!changes) return;
      if (changes.password !== changes.passwordVerification) {
        this.errorInForm = true;
        this.errorMessage = 'Passwords do not match';
      } else {
        this.errorInForm = false;
        this.errorMessage = '';
      }
    });
  }

  async onSubmitForm() {
    const form = this.signupForm.getRawValue();

    const registered = await this.authBusiness.register(
      form.login,
      form.password
    );
    if (registered) {
      this.router.navigate(['auth/login']);
    } else {
      this.errorInForm = true;
      this.errorMessage = 'An error occured';
    }
  }
}
