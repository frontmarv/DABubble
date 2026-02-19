import { Routes } from '@angular/router';
import { ChatRoom } from './pages/chat-room/chat-room';
import { Login } from './pages/login/login';
import { Imprint } from './pages/imprint/imprint';
import { PrivacyPolicy } from './pages/privacy-policy/privacy-policy';
import { authGuard } from './services/auth.guard';
import { PasswordReset } from './pages/password-reset/password-reset';
import { NewPassword } from './pages/password-reset/new-password/new-password';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: Login },
    { path: 'main', component: ChatRoom, canActivate: [authGuard] },
    { path: 'imprint', component: Imprint },
    { path: 'privacy-policy', component: PrivacyPolicy },
    { path: 'pw-reset', component: PasswordReset },
    { path: 'new-pw', component: NewPassword },
];