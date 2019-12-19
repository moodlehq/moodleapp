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

import { Injectable, OnDestroy } from '@angular/core';
import { CoreUserDelegate, CoreUserProfileHandler, CoreUserProfileHandlerData } from '@core/user/providers/user-delegate';
import { CoreSitesProvider } from '@providers/sites';
import { AddonMessagesProvider } from './messages';
import { AddonMessagesAddContactUserHandler } from './user-add-contact-handler';
import { CoreEventsProvider } from '@providers/events';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { TranslateService } from '@ngx-translate/core';

/**
 * Profile block/unblock contact handler.
 */
@Injectable()
export class AddonMessagesBlockContactUserHandler implements CoreUserProfileHandler, OnDestroy {
    /**
     * Update handler information event.
     */
    static UPDATED_EVENT = 'AddonMessagesBlockContactUserHandler_updated_event';

    name = 'AddonMessages:blockContact';
    priority = 600;
    type = CoreUserDelegate.TYPE_ACTION;

    protected disabled = false;
    protected updateObs: any;

    constructor(protected sitesProvider: CoreSitesProvider, private messagesProvider: AddonMessagesProvider,
            protected eventsProvider: CoreEventsProvider, private domUtils: CoreDomUtilsProvider,
            private translate: TranslateService) {

        this.updateObs = eventsProvider.on(AddonMessagesAddContactUserHandler.UPDATED_EVENT, (data) => {
            this.checkButton(data.userId);
        });
    }

    /**
     * Check if handler is enabled.
     *
     * @return Promise resolved with true if enabled, rejected or resolved with false otherwise.
     */
    isEnabled(): Promise<boolean> {
        return this.messagesProvider.isPluginEnabled();
    }

    /**
     * Check if handler is enabled for this user in this context.
     *
     * @param user User to check.
     * @param courseId Course ID.
     * @param navOptions Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param admOptions Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @return Promise resolved with true if enabled, resolved with false otherwise.
     */
    isEnabledForUser(user: any, courseId: number, navOptions?: any, admOptions?: any): boolean | Promise<boolean> {
        return user.id != this.sitesProvider.getCurrentSiteUserId();
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @return Data needed to render the handler.
     */
    getDisplayData(user: any, courseId: number): CoreUserProfileHandlerData {

        this.checkButton(user.id);

        return {
            icon: '',
            title: '',
            spinner: false,
            class: '',
            action: (event, navCtrl, user, courseId): void => {
                event.preventDefault();
                event.stopPropagation();

                if (this.disabled) {
                    return;
                }
                this.disabled = true;
                this.updateButton(user.id, {spinner: true});

                this.messagesProvider.isBlocked(user.id).then((isBlocked) => {
                    if (isBlocked) {
                        const template = this.translate.instant('addon.messages.unblockuserconfirm', {$a: user.fullname});
                        const okText = this.translate.instant('addon.messages.unblockuser');

                        return this.domUtils.showConfirm(template, undefined, okText).then(() => {
                            return this.messagesProvider.unblockContact(user.id);
                        });
                    } else {
                        const template = this.translate.instant('addon.messages.blockuserconfirm', {$a: user.fullname});
                        const okText = this.translate.instant('addon.messages.blockuser');

                        return this.domUtils.showConfirm(template, undefined, okText).then(() => {
                            return this.messagesProvider.blockContact(user.id);
                        });
                    }
                }).catch((error) => {
                    this.domUtils.showErrorModalDefault(error, 'core.error', true);
                }).finally(() => {
                    this.eventsProvider.trigger(AddonMessagesBlockContactUserHandler.UPDATED_EVENT, {userId: user.id});
                    this.checkButton(user.id).finally(() => {
                        this.disabled = false;
                    });
                });

            }
        };
    }

    /**
     * Update Button with avalaible data.
     * @param userId User Id to update.
     * @return Promise resolved when done.
     */
    protected checkButton(userId: number): Promise<void> {
        this.updateButton(userId, {spinner: true});

        return this.messagesProvider.isBlocked(userId).then((isBlocked) => {
            if (isBlocked) {
                this.updateButton(userId, {
                    title: 'addon.messages.unblockuser',
                    class: 'addon-messages-unblockcontact-handler',
                    icon: 'checkmark-circle',
                    hidden: false,
                    spinner: false
                });
            } else {
                this.updateButton(userId, {
                    title: 'addon.messages.blockuser',
                    class: 'addon-messages-blockcontact-handler',
                    icon: 'close-circle',
                    hidden: false,
                    spinner: false
                });
            }
        }).catch(() => {
            // This fails for some reason, let's just hide the button.
            this.updateButton(userId, {hidden: true});
        });
    }

    /**
     * Triggers the event to update the handler information.
     *
     * @param userId The user ID the handler belongs to.
     * @param data Data that should be updated.
     */
    protected updateButton(userId: number, data: any): void {
        // This fails for some reason, let's just hide the button.
        this.eventsProvider.trigger(CoreUserDelegate.UPDATE_HANDLER_EVENT, { handler: this.name, data: data, userId: userId });
    }

    /**
     * Destroyed method.
     */
    ngOnDestroy(): void {
        this.updateObs && this.updateObs.off();
    }
}
