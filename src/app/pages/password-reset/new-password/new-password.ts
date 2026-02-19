import { Component, signal, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { confirmPasswordReset } from 'firebase/auth';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-new-password',
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './new-password.html',
  styleUrl: './new-password.scss',
})
export class NewPassword {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(Auth);

  showSuccessMessage: boolean = false;
  errorMessage: string = '';
  resetCodeFromEmail: string = '';
  isSubmitDisabled: boolean = false;
  pw1 = signal('');
  pw2 = signal('');



  constructor() {
    this.resetCodeFromEmail = this.route.snapshot.queryParams['oobCode'];
    if (!this.resetCodeFromEmail) {
      alert('Ungültiger Link!');
      this.router.navigate(['/pw-reset']);
    }
  }

  validatePw1() {
    if (this.pw1().length < 6) {
      this.errorMessage = 'Das Passwort muss mindestens 6 Zeichen lang sein.';
    } else {
      this.errorMessage = '';
    }
  }

  validatePw2() {
    if (this.pw2() !== this.pw1()) {
      this.errorMessage = 'Die Passwörter stimmen nicht überein.';
    } else {
      this.errorMessage = '';
    }
  }

  async save() {
    if (this.resetCodeFromEmail) {
      try {
        this.isSubmitDisabled = true;
        this.showSuccessMessage = true;
        await confirmPasswordReset(this.auth, this.resetCodeFromEmail, this.pw2());

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1500);
      } catch (e: any) {
        alert('Fehler: ' + e.message);
      }
    }
  }
}
