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

import { Component, Input, OnInit, Optional } from '@angular/core';
import { CoreSiteInfo } from '@classes/sites/unauthenticated-site';
import { CoreUserTourDirectiveOptions } from '@directives/user-tour';
import { CoreUserToursAlignment, CoreUserToursSide } from '@features/usertours/services/user-tours';
import { IonRouterOutlet } from '@ionic/angular';
import { CoreScreen } from '@services/screen';
import { CoreSites } from '@services/sites';
import { CoreModals } from '@services/modals';
import { CoreMainMenuUserMenuTourComponent } from '../user-menu-tour/user-menu-tour';
import { CoreMainMenuPage } from '@features/mainmenu/pages/menu/menu';
import { toBoolean } from '@/core/transforms/boolean';

/**
 * Component to display an avatar on the header to open user menu.
 *
 * Example: <core-user-menu-button></core-user-menu-button>
 */
@Component({
    selector: 'core-user-menu-button',
    templateUrl: 'user-menu-button.html',
    styleUrls: ['user-menu-button.scss'],
})
export class CoreMainMenuUserButtonComponent implements OnInit {

    @Input({ transform: toBoolean }) alwaysShow = false;
    siteInfo?: CoreSiteInfo;
    isMainScreen = false;
    userTour: CoreUserTourDirectiveOptions = {
        id: 'user-menu',
        component: CoreMainMenuUserMenuTourComponent,
        alignment: CoreUserToursAlignment.Start,
        side: CoreScreen.isMobile ? CoreUserToursSide.Start : CoreUserToursSide.End,
    };

    constructor(protected routerOutlet: IonRouterOutlet, @Optional() protected menuPage: CoreMainMenuPage | null) {
        this.siteInfo = CoreSites.getCurrentSite()?.getInfo();
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.isMainScreen = !this.routerOutlet.canGoBack();
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
