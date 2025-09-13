import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
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
export class RegisterPageComponent implements OnInit {
  signupForm!: FormGroup;
  errorMessage: string = '';
  errorInForm: boolean = false;
  formObserver$!: any;

  constructor(private formBuilder: FormBuilder, private router: Router) {}

  async onSubmitForm() {
    if (
      this.signupForm.value.password !=
      this.signupForm.value.passwordVerification
    ) {
      this.errorInForm = true;
      this.errorMessage = 'Passwords do not match';
      return;
    }

    const registered = false;
    if (registered) {
      this.router.navigate(['auth/login']);
    } else {
      this.errorInForm = true;
      this.errorMessage = 'An error occured';
    }
  }

  ngOnInit(): void {
    this.signupForm = this.formBuilder.group(
      {
        login: [null, [Validators.required]],
        password: [null, [Validators.required, Validators.minLength(8)]],
        passwordVerification: [
          null,
          [Validators.required, Validators.minLength(8)],
        ],
      },
      passwordMatchValidator
    );

    //listen to changes in the form and update the error message accordingly
    // this.formObserver$ = this.signupForm.valueChanges
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe((value) => {
    //     if (
    //       value.password != value.passwordVerification &&
    //       value.password != null &&
    //       value.passwordVerification != null
    //     ) {
    //       this.errorInForm = true;
    //       this.errorMessage = 'Passwords do not match';
    //     } else {
    //       this.errorInForm = false;
    //       this.errorMessage = '';
    //     }
    //   });
  }
}
