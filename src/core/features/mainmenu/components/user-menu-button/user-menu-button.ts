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

import { Component, OnInit, inject, input, linkedSignal, signal } from '@angular/core';
import { CoreSiteInfo } from '@classes/sites/unauthenticated-site';
import { IonRouterOutlet } from '@ionic/angular';
import { CoreSites } from '@services/sites';
import { CoreModals } from '@services/overlays/modals';
import CoreMainMenuPage from '@features/mainmenu/pages/menu/menu';
import { toBoolean } from '@/core/transforms/boolean';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreMainMenuPlacement } from '@features/mainmenu/constants';

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
export class CoreMainMenuUserButtonComponent implements OnInit {

    readonly alwaysShow = input(false, { transform: toBoolean });

    readonly siteInfo = signal<CoreSiteInfo | undefined>(undefined);
    readonly showButton = linkedSignal(() => this.shouldShowButton());

    protected routerOutlet = inject(IonRouterOutlet);
    protected menuPage = inject(CoreMainMenuPage, { optional: true });

    constructor() {
        this.siteInfo.set(CoreSites.getCurrentSite()?.getInfo());
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.showButton.set(this.shouldShowButton());
    }

    /**
     * Determine if the button should be shown.
     *
     * @returns True if the button should be shown, false otherwise.
     */
    protected shouldShowButton(): boolean {
        if (!this.siteInfo()) {
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
