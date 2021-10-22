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
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { CoreUser, CoreUserProfile } from '@features/user/services/user';
import { CoreUserProfileHandlerData, CoreUserDelegate, CoreUserDelegateService } from '@features/user/services/user-delegate';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
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
    logoutLabel = 'core.mainmenu.changesite';
    siteUrl?: string;
    handlers: CoreUserProfileHandlerData[] = [];
    handlersLoaded = false;
    user?: CoreUserProfile;

    protected subscription!: Subscription;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {

        const currentSite = CoreSites.getRequiredCurrentSite();

        this.siteInfo = currentSite.getInfo();
        this.siteName = currentSite.getSiteName();
        this.siteUrl = currentSite.getURL();
        this.logoutLabel = CoreLoginHelper.getLogoutLabel(currentSite);

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
