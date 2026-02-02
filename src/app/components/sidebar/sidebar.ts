import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; 

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  channelsOpen = true;
  dmOpen = true;

  toggleChannels() {
    this.channelsOpen = !this.channelsOpen;
  }

  toggleDm() {
    this.dmOpen = !this.dmOpen;
  }
}
