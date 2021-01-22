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
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { makeSingleton, Translate } from '@singletons';
import {
    CoreUserDelegateService,
    CoreUserProfileHandler,
    CoreUserProfileHandlerData,
} from '@features/user/services/user-delegate';
import { AddonMessages } from '../messages';
import { CoreSites } from '@services/sites';
import { CoreUserProfile } from '@features/user/services/user';
import { CoreDomUtils } from '@services/utils/dom';

/**
 * Profile add/remove contact handler.
 */
@Injectable({ providedIn: 'root' })
export class AddonMessagesAddContactUserHandlerService implements CoreUserProfileHandler, OnDestroy {

    /**
     * Update handler information event.
     */
    static readonly UPDATED_EVENT = 'AddonMessagesAddContactUserHandler_updated_event';

    name = 'AddonMessages:addContact';
    priority = 800;
    type = CoreUserDelegateService.TYPE_ACTION;

    protected disabled = false;
    protected updateObserver: CoreEventObserver;

    constructor() {
        this.updateObserver = CoreEvents.on<{ userId: number }>(
            AddonMessagesAddContactUserHandlerService.UPDATED_EVENT,
            (data) => {
                this.checkButton(data.userId);
            },
        );
    }

    /**
     * Check if handler is enabled.
     *
     * @return Promise resolved with true if enabled, rejected or resolved with false otherwise.
     */
    async isEnabled(): Promise<boolean> {
        return AddonMessages.instance.isPluginEnabled();
    }

    /**
     * Check if handler is enabled for this user in this context.
     *
     * @param user User to check.
     * @return Promise resolved with true if enabled, resolved with false otherwise.
     */
    async isEnabledForUser(user: CoreUserProfile): Promise<boolean> {
        return user.id != CoreSites.instance.getCurrentSiteUserId();
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @param user User object.
     * @return Data needed to render the handler.
     */
    getDisplayData(user: CoreUserProfile): CoreUserProfileHandlerData {
        this.checkButton(user.id);

        return {
            icon: '',
            title: '',
            spinner: false,
            class: '',
            action: async (event: Event, user: CoreUserProfile): Promise<void> => {
                event.preventDefault();
                event.stopPropagation();

                if (this.disabled) {
                    return;
                }
                this.disabled = true;
                this.updateButton(user.id, { spinner: true });

                try {
                    const isContact = await AddonMessages.instance.isContact(user.id);
                    if (isContact) {
                        const message = Translate.instance.instant('addon.messages.removecontactconfirm', { $a: user.fullname });
                        const okText = Translate.instance.instant('core.remove');
                        let confirm = false;

                        try {
                            await CoreDomUtils.instance.showConfirm(message, undefined, okText);
                            confirm = true;
                        } catch {
                            // Do nothing.
                            confirm = false;
                        }

                        if (confirm) {
                            await AddonMessages.instance.removeContact(user.id);
                        }
                    } else {
                        await this.addContact(user);
                    }
                } catch (error) {
                    CoreDomUtils.instance.showErrorModalDefault(error, 'core.error', true);
                } finally {
                    CoreEvents.trigger(AddonMessagesAddContactUserHandlerService.UPDATED_EVENT, { userId: user.id });

                    this.checkButton(user.id).finally(() => {
                        this.disabled = false;
                    });
                }

            },
        };
    }

    /**
     * Update Button with avalaible data.
     *
     * @param userId User Id to update.
     * @return Promise resolved when done.
     */
    protected async checkButton(userId: number): Promise<void> {
        this.updateButton(userId, { spinner: true });

        const groupMessagingEnabled = AddonMessages.instance.isGroupMessagingEnabled();

        try {
            const isContact = await AddonMessages.instance.isContact(userId);

            if (isContact) {
                this.updateButton(userId, {
                    title: groupMessagingEnabled ? 'addon.messages.removefromyourcontacts' : 'addon.messages.removecontact',
                    class: 'addon-messages-removecontact-handler',
                    icon: 'fas-user-times',
                    hidden: false,
                    spinner: false,
                });
            } else {
                this.updateButton(userId, {
                    title: groupMessagingEnabled ? 'addon.messages.addtoyourcontacts' : 'addon.messages.addcontact',
                    class: 'addon-messages-addcontact-handler',
                    icon: 'fas-user-plus',
                    hidden: false,
                    spinner: false,
                });
            }
        } catch {
            // This fails for some reason, let's just hide the button.
            this.updateButton(userId, { hidden: true });
        }
    }

    /**
     * Triggers the event to update the handler information.
     *
     * @param userId The user ID the handler belongs to.
     * @param data Data that should be updated.
     */
    protected updateButton(userId: number, data: Record<string, unknown>): void {
        // This fails for some reason, let's just hide the button.
        CoreEvents.trigger(CoreUserDelegateService.UPDATE_HANDLER_EVENT, { handler: this.name, data: data, userId: userId });
    }

    /**
     * Add a contact or send a contact request if group messaging is enabled.
     *
     * @param user User to add as contact.
     * @return Promise resolved when done.
     */
    protected async addContact(user: CoreUserProfile): Promise<void> {
        if (!AddonMessages.instance.isGroupMessagingEnabled()) {
            return AddonMessages.instance.addContact(user.id);
        }

        const member = await AddonMessages.instance.getMemberInfo(user.id);
        const currentUserId = CoreSites.instance.getCurrentSiteUserId();
        const requestSent = member.contactrequests?.some((request) =>
            request.userid == currentUserId && request.requesteduserid == user.id);
        if (requestSent) {
            const message = Translate.instance.instant('addon.messages.yourcontactrequestpending', { $a: user.fullname });

            await CoreDomUtils.instance.showAlert(undefined, message);

            return;
        }

        const message = Translate.instance.instant('addon.messages.addcontactconfirm', { $a: user.fullname });
        const okText = Translate.instance.instant('core.add');
        await CoreDomUtils.instance.showConfirm(message, undefined, okText);

        await AddonMessages.instance.createContactRequest(user.id);

        await CoreDomUtils.instance.showAlert(undefined, Translate.instance.instant('addon.messages.contactrequestsent'));
    }

    /**
     * Destroyed method.
     */
    ngOnDestroy(): void {
        this.updateObserver?.off();
    }

}

export class AddonMessagesAddContactUserHandler extends makeSingleton(AddonMessagesAddContactUserHandlerService) {}
