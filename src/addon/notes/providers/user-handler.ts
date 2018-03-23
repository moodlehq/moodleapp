// (C) Copyright 2015 Martin Dougiamas
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

import { Injectable } from '@angular/core';
import { ModalController } from 'ionic-angular';
import { CoreEventsProvider } from '@providers/events';
import { CoreUserProvider } from '@core/user/providers/user';
import { CoreUserDelegate, CoreUserProfileHandler, CoreUserProfileHandlerData } from '@core/user/providers/user-delegate';
import { CoreSitesProvider } from '@providers/sites';
import { AddonNotesProvider } from './notes';

/**
 * Profile notes handler.
 */
@Injectable()
export class AddonNotesUserHandler implements CoreUserProfileHandler {
    name = 'AddonNotes:addNote';
    priority = 200;
    type = CoreUserDelegate.TYPE_COMMUNICATION;
    addNoteEnabledCache = {};

    constructor(private modalCtrl: ModalController, private sitesProvider: CoreSitesProvider,
            private notesProvider: AddonNotesProvider, eventsProvider: CoreEventsProvider) {
        eventsProvider.on(CoreEventsProvider.LOGOUT, this.clearAddNoteCache.bind(this));
        eventsProvider.on(CoreUserProvider.PROFILE_REFRESHED, (data) => {
            this.clearAddNoteCache(data.courseId);
        });
    }

    /**
     * Clear add note cache.
     * If a courseId is specified, it will only delete the entry for that course.
     *
     * @param {number} [courseId] Course ID.
     */
    private clearAddNoteCache(courseId?: number): void {
        if (courseId) {
            delete this.addNoteEnabledCache[courseId];
        } else {
            this.addNoteEnabledCache = {};
        }
    }

    /**
     * Whether or not the handler is enabled on a site level.
     * @return {boolean|Promise<boolean>} Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean | Promise<boolean> {
        return this.notesProvider.isPluginEnabled();
    }

    /**
     * Check if handler is enabled for this user in this context.
     *
     * @param {any} user User to check.
     * @param {number} courseId Course ID.
     * @param {any} [navOptions] Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param {any} [admOptions] Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @return {boolean|Promise<boolean>} Promise resolved with true if enabled, resolved with false otherwise.
     */
    isEnabledForUser(user: any, courseId: number, navOptions?: any, admOptions?: any): boolean | Promise<boolean> {
        // Active course required.
        if (!courseId || user.id == this.sitesProvider.getCurrentSiteUserId()) {
            return Promise.resolve(false);
        }

        if (typeof this.addNoteEnabledCache[courseId] != 'undefined') {
            return this.addNoteEnabledCache[courseId];
        }

        return this.notesProvider.isPluginAddNoteEnabledForCourse(courseId).then((enabled) => {
            this.addNoteEnabledCache[courseId] = enabled;

            return enabled;
        });
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @return {CoreUserProfileHandlerData} Data needed to render the handler.
     */
    getDisplayData(user: any, courseId: number): CoreUserProfileHandlerData {
        return {
            icon: 'list',
            title: 'addon.notes.addnewnote',
            class: 'addon-notes-handler',
            action: (event, navCtrl, user, courseId): void => {
                event.preventDefault();
                event.stopPropagation();
                const modal = this.modalCtrl.create('AddonNotesAddPage', { userId: user.id, courseId });
                modal.present();
            }
        };
    }
}
