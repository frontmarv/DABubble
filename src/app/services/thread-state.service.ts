import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root' 
})
export class ThreadStateService {
    private _isThreadVisible = signal(true);
    isThreadVisible = this._isThreadVisible.asReadonly();

    toggle() {
        this._isThreadVisible.update(visible => !visible);
    }

    setHidden() {
        this._isThreadVisible.set(false);
    }

    setVisible() {
        this._isThreadVisible.set(true);
    }

    // How to use this service in other components:
    // import the service z.B: import { ThreadStateService } from './thread-state.service';
    // in der class: public threadService = inject(ThreadStateService);
    // im HTML: z.B: <button (click)="threadService.toggle()">

}