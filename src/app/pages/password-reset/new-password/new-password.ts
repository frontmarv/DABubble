import { Component, signal, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-new-password',
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './new-password.html',
  styleUrl: './new-password.scss',
})
export class NewPassword {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  errorMessage: string = '';
  resetCodeFromEmail: string | null;
  showSuccessMessage: boolean = false;

  // Signals für die UI-States
  pw1 = signal('');
  pw2 = signal('');



  constructor() {
    // In Angular 21 liest man Parameter oft direkt im Constructor oder via Input-Binding
    this.resetCodeFromEmail = this.route.snapshot.queryParams['oobCode'];

    if (!this.resetCodeFromEmail) {
      alert('Ungültiger Link!');
      this.router.navigate(['/pw-reset']);
    }
  }

  async save() {
    if (this.resetCodeFromEmail) {
      try {
        await this.authService.confirmReset(this.resetCodeFromEmail, this.pw1());
        alert('Passwort geändert!');
        this.router.navigate(['/login']);
      } catch (e: any) {
        alert('Fehler: ' + e.message);
      }
    }
  }
}
