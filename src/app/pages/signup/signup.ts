import { Component, EventEmitter, Output, inject, ChangeDetectorRef } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrls: ['../login/login.scss', './signup.scss']
})
export class SignupComponent {
  // --- INJECTIONS ---
  private authService = inject(AuthService);
  private changeDetectorRef = inject(ChangeDetectorRef);

  // --- OUTPUTS ---
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  // --- STATE ---
  signupStep: number = 1;
  errorMessage: string = '';
  isLoading: boolean = false;

  // --- FORM DATA ---
  fullName: string = '';
  email: string = '';
  password: string = '';
  isPrivacyPolicyAccepted = false;
  selectedAvatar: string = '/shared/profile-pics/unkown-user.svg';

  // --- VALIDATION STATE ---
  isNameValid: boolean = false;
  isEmailValid: boolean = false;
  isPasswordValid: boolean = false;

  // --- CONSTANTS ---
  readonly avatars = [
    '/shared/profile-pics/unkown-user.svg',
    '/shared/profile-pics/profile-pic1.svg',
    '/shared/profile-pics/profile-pic2.svg',
    '/shared/profile-pics/profile-pic3.svg',
    '/shared/profile-pics/profile-pic4.svg',
    '/shared/profile-pics/profile-pic5.svg',
    '/shared/profile-pics/profile-pic6.svg'
  ];

  // --- VALIDATION LOGIC ---

  validateName(): void {
    const name = this.fullName.trim();
    if (!name) return this.setValidationError('isNameValid', 'Bitte Name eingeben');
    if (name.length > 30) return this.setValidationError('isNameValid', 'Name darf max. 30 Zeichen enthalten');
    
    this.clearValidationError('isNameValid');
  }

  validateEmail(): void {
    const mail = this.email.trim();
    if (!mail || !this.isValidEmailFormat(mail)) return this.setValidationError('isEmailValid', 'Bitte gültige E-Mail-Adresse eingeben');
    if (mail.length > 50) return this.setValidationError('isEmailValid', 'E-mail-Adresse darf max. 50 Zeichen enthalten');
    
    this.clearValidationError('isEmailValid');
  }

  validatePassword(): void {
    if (!this.password || this.password.length < 6) {
      return this.setValidationError('isPasswordValid', 'Passwort muss min. 6 Zeichen enthalten');
    }
    this.clearValidationError('isPasswordValid');
  }

  private setValidationError(field: 'isNameValid' | 'isEmailValid' | 'isPasswordValid', msg: string): void {
    this[field] = false;
    this.errorMessage = msg;
  }

  private clearValidationError(field: 'isNameValid' | 'isEmailValid' | 'isPasswordValid'): void {
    this[field] = true;
    this.errorMessage = '';
  }

  private isValidEmailFormat(email: string): boolean {
    const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return emailRegex.test(email);
  }

  isFormValid(): boolean {
    return this.isNameValid && this.isEmailValid && this.isPasswordValid && this.isPrivacyPolicyAccepted;
  }

  // --- STEP NAVIGATION & UI ---

  nextStep(): void {
    if (this.isFormValid()) {
      this.signupStep = 2;
      this.errorMessage = '';
    } else {
      this.errorMessage = 'Bitte alle Felder korrekt ausfüllen';
    }
  }

  prevStep(): void {
    this.signupStep = 1;
    this.errorMessage = '';
  }

  selectAvatar(avatar: string): void {
    this.selectedAvatar = avatar;
  }

  // --- SUBMISSION ---

  async finishSignup(): Promise<void> {
    this.prepareForSubmission();
    const { firstName, lastName } = this.extractNames();
    
    const result = await this.authService.signup(
      this.email, this.password, firstName, lastName, this.selectedAvatar, 'offline'
    );

    this.handleSignupResult(result);
  }

  private prepareForSubmission(): void {
    this.errorMessage = '';
    this.isLoading = true;
  }

  private extractNames(): { firstName: string, lastName: string } {
    const parts = this.fullName.trim().split(' ');
    return {
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' ') || ''
    };
  }

  private handleSignupResult(result: any): void {
    if (result.success) {
      this.success.emit();
    } else {
      this.errorMessage = result.error || 'Registrierung fehlgeschlagen.';
      this.changeDetectorRef.markForCheck();
    }
  }
}