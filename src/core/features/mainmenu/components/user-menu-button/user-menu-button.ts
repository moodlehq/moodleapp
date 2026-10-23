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

import { Component, computed, inject, input, signal } from '@angular/core';
import { IonRouterOutlet } from '@ionic/angular';
import { CoreSites } from '@services/sites';
import { CoreModals } from '@services/overlays/modals';
import CoreMainMenuPage from '@features/mainmenu/pages/menu/menu';
import { toBoolean } from '@/core/transforms/boolean';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreMainMenuPlacement } from '@features/mainmenu/constants';
import { CoreUser, CoreUserProfile } from '@features/user/services/user';

/**
 * Component to display an avatar on the header to open user menu.
 *
 * Example: <core-user-menu-button></core-user-menu-button>
 */
@Component({
    selector: 'core-user-menu-button',
    templateUrl: 'user-menu-button.html',
    styleUrl: 'user-menu-button.scss',
    imports: [
        CoreSharedModule,
    ],
})
export class CoreMainMenuUserButtonComponent {

    readonly alwaysShow = input(false, { transform: toBoolean });

    readonly showButton = computed(() => this.shouldShowButton());

    protected readonly user = signal<CoreUserProfile | undefined>(undefined);

    protected routerOutlet = inject(IonRouterOutlet);
    protected menuPage = inject(CoreMainMenuPage, { optional: true });

    constructor() {
        this.initUser();
    }

    /**
     * Initialize the user profile.
     */
    async initUser(): Promise<void> {
        const currentSite = CoreSites.getRequiredCurrentSite();
        const siteInfo = currentSite.getInfo();
        if (siteInfo) {
            this.user.set({
                id: siteInfo.userid,
                fullname: siteInfo.fullname,
                profileimageurl: siteInfo.userpictureurl,
            });
        }

        try {
            const userId = currentSite.getUserId();
            this.user.set(await CoreUser.getProfile(userId));
        } catch {
            // Ignore errors.
        }
    }

    /**
     * Determine if the button should be shown.
     *
     * @returns True if the button should be shown, false otherwise.
     */
    protected shouldShowButton(): boolean {
        if (!this.user()) {
            return false;
        }

        if (this.alwaysShow()) {
            return true;
        }

        const isMainScreen = !this.routerOutlet.canGoBack();
        const tabsPlacement = this.menuPage?.tabsPlacement();

        return isMainScreen && tabsPlacement === CoreMainMenuPlacement.BOTTOM;
    }

    /**
     * Open User menu
     *
     * @param event Click event.
     */
    async openUserMenu(event: Event): Promise<void> {
        event.preventDefault();
        event.stopPropagation();

        const { CoreMainMenuUserMenuComponent } = await import('../user-menu/user-menu');

        CoreModals.openSideModal<void>({
            component: CoreMainMenuUserMenuComponent,
        });
    }

}
