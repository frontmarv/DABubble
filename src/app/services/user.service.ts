import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { User } from '../models/user.class'; 

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private currentUserSubject = new BehaviorSubject<User>(new User({
    uid: '123',
    firstName: 'Frederik',
    lastName: 'Beck',
    email: 'fred.beck@email.com',
    avatar: 'profile-pic1.svg'
  }));

  currentUser$ = this.currentUserSubject.asObservable();

  updateUser(updatedData: Partial<User>) {
    const current = this.currentUserSubject.value;
    const newUser = new User({ ...current, ...updatedData });
    this.currentUserSubject.next(newUser);
  }
}