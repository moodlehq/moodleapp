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
import { AddonMessagesBlockContactUserHandler } from './user-block-contact-handler';
import { CoreEventsProvider } from '@providers/events';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { TranslateService } from '@ngx-translate/core';

/**
 * Profile add/remove contact handler.
 */
@Injectable()
export class AddonMessagesAddContactUserHandler implements CoreUserProfileHandler, OnDestroy {
    /**
     * Update handler information event.
     */
    static UPDATED_EVENT = 'AddonMessagesAddContactUserHandler_updated_event';

    name = 'AddonMessages:addContact';
    priority = 800;
    type = CoreUserDelegate.TYPE_ACTION;

    protected disabled = false;
    protected updateObs: any;

    constructor(protected sitesProvider: CoreSitesProvider,
            private messagesProvider: AddonMessagesProvider, protected eventsProvider: CoreEventsProvider,
            private domUtils: CoreDomUtilsProvider, private translate: TranslateService) {

        this.updateObs = eventsProvider.on(AddonMessagesBlockContactUserHandler.UPDATED_EVENT, (data) => {
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

                this.messagesProvider.isContact(user.id).then((isContact) => {
                    if (isContact) {
                        const message = this.translate.instant('addon.messages.removecontactconfirm', {$a: user.fullname});
                        const okText = this.translate.instant('core.remove');

                        return this.domUtils.showConfirm(message, undefined, okText).then(() => {
                            return this.messagesProvider.removeContact(user.id);
                        });
                    } else {
                        return this.addContact(user);
                    }
                }).catch((error) => {
                    this.domUtils.showErrorModalDefault(error, 'core.error', true);
                }).finally(() => {
                    this.eventsProvider.trigger(AddonMessagesAddContactUserHandler.UPDATED_EVENT, {userId: user.id});
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

        const groupMessagingEnabled = this.messagesProvider.isGroupMessagingEnabled();

        return this.messagesProvider.isContact(userId).then((isContact) => {
            if (isContact) {
                this.updateButton(userId, {
                    title: groupMessagingEnabled ? 'addon.messages.removefromyourcontacts' : 'addon.messages.removecontact',
                    class: 'addon-messages-removecontact-handler',
                    icon: 'remove',
                    hidden: false,
                    spinner: false
                });
            } else {
                this.updateButton(userId, {
                    title: groupMessagingEnabled ? 'addon.messages.addtoyourcontacts' : 'addon.messages.addcontact',
                    class: 'addon-messages-addcontact-handler',
                    icon: 'add',
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
     * Add a contact or send a contact request if group messaging is enabled.
     *
     * @param user User to add as contact.
     * @return Promise resolved when done.
     */
    protected addContact(user: any): Promise<any> {
        if (!this.messagesProvider.isGroupMessagingEnabled()) {
            return this.messagesProvider.addContact(user.id);
        }

        return this.messagesProvider.getMemberInfo(user.id).then((member) => {
            const currentUserId = this.sitesProvider.getCurrentSiteUserId();
            const requestSent = member.contactrequests.some((request) => {
                return request.userid == currentUserId && request.requesteduserid == user.id;
            });

            if (requestSent) {
                const message = this.translate.instant('addon.messages.yourcontactrequestpending', {$a: user.fullname});

               return this.domUtils.showAlert(null, message);
            }

            const message = this.translate.instant('addon.messages.addcontactconfirm', {$a: user.fullname});
            const okText = this.translate.instant('core.add');

            return this.domUtils.showConfirm(message, undefined, okText).then(() => {
                return this.messagesProvider.createContactRequest(user.id);
            }).then(() => {
                const message = this.translate.instant('addon.messages.contactrequestsent');

                return this.domUtils.showAlert(null, message);
            });
        });
    }

    /**
     * Destroyed method.
     */
    ngOnDestroy(): void {
        this.updateObs && this.updateObs.off();
    }
}
