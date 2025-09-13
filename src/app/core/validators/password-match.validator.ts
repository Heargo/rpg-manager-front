import {
  AbstractControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';

export const passwordMatchValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  const form = control as FormGroup;
  if (form.get('password')?.value !== form.get('passwordVerification')?.value) {
    return { passwordMismatch: true };
  }
  return null;
};
