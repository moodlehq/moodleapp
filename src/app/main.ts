import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app.module';

import { shim } from 'promise.prototype.finally';

shim(); // Support promise.finally.

platformBrowserDynamic().bootstrapModule(AppModule);
