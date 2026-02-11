import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app'; // Geändert von App zu AppComponent

bootstrapApplication(App, appConfig) // Geändert von App zu AppComponent
  .catch((err) => console.error(err));