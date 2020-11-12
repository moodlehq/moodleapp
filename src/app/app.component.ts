// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';

import { CoreLangProvider } from '@services/lang';
import { CoreLoginHelperProvider } from '@core/login/services/login.helper';
import { CoreEvents, CoreEventSessionExpiredData } from '@singletons/events';
import { Network, NgZone, Platform } from '@singletons/core.singletons';
import { CoreApp } from '@services/app';

@Component({
    selector: 'app-root',
    templateUrl: 'app.component.html',
    styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {

    constructor(
        protected langProvider: CoreLangProvider,
        protected navCtrl: NavController,
        protected loginHelper: CoreLoginHelperProvider,
    ) {
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        CoreEvents.on(CoreEvents.LOGOUT, () => {
            // Go to sites page when user is logged out.
            this.navCtrl.navigateRoot('/login/sites');

            // Unload lang custom strings.
            this.langProvider.clearCustomStrings();

            // Remove version classes from body.
            this.removeVersionClass();
        });

        // Listen for session expired events.
        CoreEvents.on(CoreEvents.SESSION_EXPIRED, (data: CoreEventSessionExpiredData) => {
            this.loginHelper.sessionExpired(data);
        });

        this.onPlatformReady();
    }

    protected async onPlatformReady(): Promise<void> {
        await Platform.instance.ready();

        // Refresh online status when changes.
        Network.instance.onChange().subscribe(() => {
            // Execute the callback in the Angular zone, so change detection doesn't stop working.
            NgZone.instance.run(() => {
                const isOnline = CoreApp.instance.isOnline();
                const hadOfflineMessage = document.body.classList.contains('core-offline');

                document.body.classList.toggle('core-offline', !isOnline);

                if (isOnline && hadOfflineMessage) {
                    document.body.classList.add('core-online');

                    setTimeout(() => {
                        document.body.classList.remove('core-online');
                    }, 3000);
                } else if (!isOnline) {
                    document.body.classList.remove('core-online');
                }
            });
        });
    }

    /**
     * Convenience function to add version to body classes.
     *
     * @param release Current release number of the site.
     */
    protected addVersionClass(release: string): void {
        const parts = release.split('.', 3);

        parts[1] = parts[1] || '0';
        parts[2] = parts[2] || '0';

        document.body.classList.add(
            'version-' + parts[0],
            'version-' + parts[0] + '-' + parts[1],
            'version-' + parts[0] + '-' + parts[1] + '-' + parts[2],
        );
    }

    /**
     * Convenience function to remove all version classes form body.
     */
    protected removeVersionClass(): void {
        const remove: string[] = [];

        Array.from(document.body.classList).forEach((tempClass) => {
            if (tempClass.substring(0, 8) == 'version-') {
                remove.push(tempClass);
            }
        });

        remove.forEach((tempClass) => {
            document.body.classList.remove(tempClass);
        });
    }

}
