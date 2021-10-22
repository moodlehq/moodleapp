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

import { Component, OnDestroy, OnInit } from '@angular/core';
import { CoreSiteInfo } from '@classes/site';
import { CoreLoginSitesComponent } from '@features/login/components/sites/sites';
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { CoreUser, CoreUserProfile } from '@features/user/services/user';
import { CoreUserProfileHandlerData, CoreUserDelegate, CoreUserDelegateService } from '@features/user/services/user-delegate';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { ModalController } from '@singletons';
import { Subscription } from 'rxjs';

/**
 * Component to display a user menu.
 */
@Component({
    selector: 'core-main-menu-user-menu',
    templateUrl: 'user-menu.html',
    styleUrls: ['user-menu.scss'],
})
export class CoreMainMenuUserMenuComponent implements OnInit, OnDestroy {

    siteInfo?: CoreSiteInfo;
    siteName?: string;
    siteUrl?: string;
    handlers: CoreUserProfileHandlerData[] = [];
    handlersLoaded = false;
    loaded = false;
    user?: CoreUserProfile;
    moreSites = false;

    protected subscription!: Subscription;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        // Check if there are more sites to switch.
        const sites = await CoreSites.getSites();
        this.moreSites = sites.length > 1;

        const currentSite = CoreSites.getRequiredCurrentSite();
        this.siteInfo = currentSite.getInfo();
        this.siteName = currentSite.getSiteName();
        this.siteUrl = currentSite.getURL();

        this.loaded = true;

        // Load the handlers.
        if (this.siteInfo) {
            this.user = await CoreUser.getProfile(this.siteInfo.userid);

            this.subscription = CoreUserDelegate.getProfileHandlersFor(this.user).subscribe((handlers) => {
                if (!handlers || !this.user) {
                    return;
                }

                this.handlers = [];
                handlers.forEach((handler) => {
                    if (handler.type == CoreUserDelegateService.TYPE_NEW_PAGE) {
                        this.handlers.push(handler.data);
                    }
                });

                this.handlersLoaded = CoreUserDelegate.areHandlersLoaded(this.user.id);
            });

        }
    }

    /**
     * Opens User profile page.
     *
     * @param event Click event.
     */
    async openUserProfile(event: Event): Promise<void> {
        if (!this.siteInfo) {
            return;
        }

        await this.close(event);

        CoreNavigator.navigateToSitePath('user/about', {
            params: {
                userId: this.siteInfo.userid,
            },
        });
    }

    /**
     * Opens preferences.
     *
     * @param event Click event.
     */
    async openPreferences(event: Event): Promise<void> {
        await this.close(event);

        CoreNavigator.navigateToSitePath('preferences');
    }

    /**
     * A handler was clicked.
     *
     * @param event Click event.
     * @param handler Handler that was clicked.
     */
    async handlerClicked(event: Event, handler: CoreUserProfileHandlerData): Promise<void> {
        if (!this.user) {
            return;
        }

        await this.close(event);

        handler.action(event, this.user);
    }

    /**
     * Logout the user.
     *
     * @param event Click event
     */
    async logout(event: Event): Promise<void> {
        await this.close(event);

        CoreSites.logout();
    }

    /**
     * Show account selector.
     *
     * @param event Click event
     */
    async switchAccounts(event: Event): Promise<void> {
        const thisModal = await ModalController.getTop();

        event.preventDefault();
        event.stopPropagation();

        const closeAll = await CoreDomUtils.openSideModal<boolean>({
            component: CoreLoginSitesComponent,
            cssClass: 'core-modal-lateral-sm',
        });

        if (closeAll) {
            await ModalController.dismiss(undefined, undefined, thisModal.id);
        }
    }

    /**
     * Add account.
     *
     * @param event Click event
     */
    async addAccount(event: Event): Promise<void> {
        await this.close(event);

        await CoreLoginHelper.goToAddSite(true, true);
    }

    /**
     * Close modal.
     */
    async close(event: Event): Promise<void> {
        event.preventDefault();
        event.stopPropagation();

        await ModalController.dismiss();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.subscription?.unsubscribe();
    }

}
