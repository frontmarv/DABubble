import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root' 
})
export class ThreadStateService {
    isThreadVisible = signal(true);

    toggle() {
        this.isThreadVisible.update(visible => !visible);
    }

    setHidden() {
        this.isThreadVisible.set(false);
    }

    setVisible() {
        this.isThreadVisible.set(true);
    }

    // How to use this service in other components:
    // import the service z.B: import { ThreadStateService } from './thread-state.service';
    // in der class: public threadService = inject(ThreadStateService);
    // im HTML: z.B: <button (click)="threadService.toggle()">

}