import { Component } from '@angular/core';
import { MessageComposer } from '../message-composer/message-composer';

@Component({
  selector: 'app-thread-panel',
  imports: [MessageComposer],
  templateUrl: './thread-panel.html',
  styleUrl: './thread-panel.scss',
})
export class ThreadPanel {

}
