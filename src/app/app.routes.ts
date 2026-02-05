import { Routes } from '@angular/router';
import { ChatRoom } from './pages/chat-room/chat-room';
import { Login } from './pages/login/login';
import { Imprint } from './pages/imprint/imprint';
import { PrivacyPolicy } from './pages/privacy-policy/privacy-policy';

export const routes: Routes = [
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: 'login', component: Login },
    { path: 'main', component: ChatRoom }, 
    { path: 'imprint', component: Imprint },
    { path: 'privacy-policy', component: PrivacyPolicy }
];
