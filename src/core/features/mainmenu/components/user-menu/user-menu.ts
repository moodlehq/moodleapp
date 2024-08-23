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

import { CoreConstants } from '@/core/constants';
import { CoreSharedModule } from '@/core/shared.module';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CoreSite } from '@classes/sites/site';
import { CoreSiteInfo } from '@classes/sites/unauthenticated-site';
import { CoreFilter } from '@features/filter/services/filter';
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { CoreUserAuthenticatedSupportConfig } from '@features/user/classes/support/authenticated-support-config';
import { CoreUserSupport } from '@features/user/services/support';
import { CoreUser, CoreUserProfile } from '@features/user/services/user';
import {
    CoreUserProfileHandlerData,
    CoreUserDelegate,
    CoreUserProfileHandlerType,
    CoreUserDelegateContext,
} from '@features/user/services/user-delegate';
import { CoreModals } from '@services/modals';
import { CoreNavigator } from '@services/navigator';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { ModalController, Translate } from '@singletons';
import { Subscription } from 'rxjs';

/**
 * Component to display a user menu.
 */
@Component({
    selector: 'core-main-menu-user-menu',
    templateUrl: 'user-menu.html',
    styleUrl: 'user-menu.scss',
    standalone: true,
    imports: [
        CoreSharedModule,
    ],
})
export class CoreMainMenuUserMenuComponent implements OnInit, OnDestroy {

    siteId?: string;
    siteInfo?: CoreSiteInfo;
    siteName?: string;
    siteLogo?: string;
    siteLogoLoaded = false;
    siteUrl?: string;
    displaySiteUrl = false;
    handlers: CoreUserProfileHandlerData[] = [];
    accountHandlers: CoreUserProfileHandlerData[] = [];
    handlersLoaded = false;
    user?: CoreUserProfile;
    displaySwitchAccount = true;
    displayContactSupport = false;
    removeAccountOnLogout = false;

    protected subscription!: Subscription;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        const currentSite = CoreSites.getRequiredCurrentSite();
        this.siteId = currentSite.getId();
        this.siteInfo = currentSite.getInfo();
        this.siteName = await currentSite.getSiteName();
        this.siteUrl = currentSite.getURL();
        this.displaySwitchAccount = !currentSite.isFeatureDisabled('NoDelegate_SwitchAccount');
        this.displayContactSupport = new CoreUserAuthenticatedSupportConfig(currentSite).canContactSupport();
        this.removeAccountOnLogout = !!CoreConstants.CONFIG.removeaccountonlogout;
        this.displaySiteUrl = currentSite.shouldDisplayInformativeLinks();

        this.loadSiteLogo(currentSite);

        if (!this.siteInfo) {
            return;
        }

        // Load the handlers.
        try {
            this.user = await CoreUser.getProfile(this.siteInfo.userid);
        } catch {
            this.user = {
                id: this.siteInfo.userid,
                fullname: this.siteInfo.fullname,
            };
        }

        this.subscription = CoreUserDelegate.getProfileHandlersFor(this.user, CoreUserDelegateContext.USER_MENU)
            .subscribe((handlers) => {
                if (!this.user) {
                    return;
                }

                let newHandlers = handlers
                    .filter((handler) => handler.type === CoreUserProfileHandlerType.LIST_ITEM)
                    .map((handler) => handler.data);

                // Only update handlers if they have changed, to prevent a blink effect.
                if (newHandlers.length !== this.handlers.length ||
                        JSON.stringify(newHandlers) !== JSON.stringify(this.handlers)) {
                    this.handlers = newHandlers;
                }

                newHandlers = handlers
                    .filter((handler) => handler.type === CoreUserProfileHandlerType.LIST_ACCOUNT_ITEM)
                    .map((handler) => handler.data);

                // Only update handlers if they have changed, to prevent a blink effect.
                if (newHandlers.length !== this.handlers.length ||
                        JSON.stringify(newHandlers) !== JSON.stringify(this.handlers)) {
                    this.accountHandlers = newHandlers;
                }

                this.handlersLoaded = CoreUserDelegate.areHandlersLoaded(this.user.id, CoreUserDelegateContext.USER_MENU);
            });
    }

    /**
     * Load site logo from current site public config.
     *
     * @param currentSite Current site object.
     * @returns Promise resolved when done.
     */
    protected async loadSiteLogo(currentSite: CoreSite): Promise<void> {
        if (currentSite.forcesLocalLogo()) {
            this.siteLogo = currentSite.getLogoUrl();
            this.siteLogoLoaded = true;

            return;
        }

        const siteConfig = await CoreUtils.ignoreErrors(currentSite.getPublicConfig());
        this.siteLogo = currentSite.getLogoUrl(siteConfig);
        this.siteLogoLoaded = true;
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

        handler.action(event, this.user, CoreUserDelegateContext.USER_MENU);
    }

    /**
     * Contact site support.
     *
     * @param event Click event.
     */
    async contactSupport(event: Event): Promise<void> {
        await this.close(event);
        await CoreUserSupport.contact();
    }

    /**
     * Logout the user.
     *
     * @param event Click event
     */
    async logout(event: Event): Promise<void> {
        if (CoreNavigator.currentRouteCanBlockLeave()) {
            await CoreDomUtils.showAlert(undefined, Translate.instant('core.cannotlogoutpageblocks'));

            return;
        }

        if (this.removeAccountOnLogout) {
            // Ask confirm.
            const siteName = this.siteName ?
                await CoreFilter.formatText(this.siteName, { clean: true, singleLine: true, filter: false }, [], this.siteId) :
                '';

            try {
                await CoreDomUtils.showDeleteConfirm('core.login.confirmdeletesite', { sitename: siteName });
            } catch (error) {
                // User cancelled, stop.
                return;
            }
        }

        await this.close(event);

        await CoreSites.logout({
            forceLogout: true,
            removeAccount: this.removeAccountOnLogout,
        });
    }

    /**
     * Show account selector.
     *
     * @param event Click event
     */
    async switchAccounts(event: Event): Promise<void> {
        if (CoreNavigator.currentRouteCanBlockLeave()) {
            await CoreDomUtils.showAlert(undefined, Translate.instant('core.cannotlogoutpageblocks'));

            return;
        }

        const thisModal = await ModalController.getTop();

        event.preventDefault();
        event.stopPropagation();

        const { CoreLoginSitesModalComponent } = await import('@features/login/components/sites-modal/sites-modal');

        const closeAll = await CoreModals.openSideModal<boolean>({
            component: CoreLoginSitesModalComponent,
            cssClass: 'core-modal-lateral core-modal-lateral-sm',
        });

        if (thisModal && closeAll) {
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
