import { Routes } from '@angular/router';
import { ChatRoom } from './pages/chat-room/chat-room';
import { Login } from './pages/login/login';

export const routes: Routes = [
    {
        path: 'login', component: Login
    }
    ,
    {
        path: '', component: ChatRoom,
    }

];
