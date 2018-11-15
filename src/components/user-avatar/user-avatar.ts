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

import { Component, Input, OnInit, OnChanges, SimpleChange } from '@angular/core';
import { NavController } from 'ionic-angular';
import { CoreSitesProvider } from '@providers/sites';

/**
 * Component to display a "user avatar".
 *
 * Example: <core-user-avatar [user]="participant"></core-user-avatar>
 */
@Component({
    selector: 'ion-avatar.user-avatar',
    templateUrl: 'core-user-avatar.html'
})
export class CoreUserAvatarComponent implements OnInit, OnChanges {
    @Input() user: any;
    // The following params will override the ones in user object.
    @Input() profileUrl?: string;
    @Input() fullname?: string;
    @Input() protected userId?: number; // If provided or found it will be used to link the image to the profile.
    @Input() protected courseId?: number;

    // Variable to check if we consider this user online or not.
    protected timetoshowusers = 300000; // Miliseconds default.
    protected myUser = false;
    protected currentUserId: number;

    constructor(private navCtrl: NavController, private sitesProvider: CoreSitesProvider) {
        this.currentUserId = this.sitesProvider.getCurrentSiteUserId();
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        console.error(this.user);
        this.setFields();

        // @TODO: This setting is not currently available so we are always using the default setting.
        /*if (!this.myUser) {
            let minutes = 5;
            this.sitesProvider.getCurrentSite().getConfig('block_online_users_timetosee').then((timetosee) => {
                minutes = timetosee || minutes;
            }).catch(() => {
                // Ignore errors.
            }).finally(() => {
                this.timetoshowusers = minutes * 60000;
            });
        }*/
    }

    /**
     * Listen to changes.
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        // If something change, update the fields.
        if (changes) {
            this.setFields();
        }
    }

    /**
     * Set fields from user.
     */
    protected setFields(): void {
        this.profileUrl = this.profileUrl || this.user.profileimageurl || this.user.userprofileimageurl ||
            this.user.userpictureurl || this.user.profileimageurlsmall;

        this.fullname = this.fullname || this.user.fullname || this.user.userfullname;

        this.userId = this.userId || this.user.userid;
        this.courseId = this.courseId || this.user.courseid;

        // If not available we cannot ensure the avatar is from the current user.
        this.myUser = this.userId && this.userId == this.currentUserId;
    }

    /**
     * Helper function for checking the time meets the 'online' condition.
     *
     * @return boolean
     */
    isOnline(): boolean {
        const time = new Date().getTime() - this.timetoshowusers;

        return !this.myUser && ((this.user.lastaccess && this.user.lastaccess * 1000 >= time) || this.user.isonline);
    }

    /**
     * Function executed image clicked.
     */
    gotoProfile(event: any): void {
        // If the event prevented default action, do nothing.
        if (!event.defaultPrevented && this.userId) {
            event.preventDefault();
            event.stopPropagation();
            this.navCtrl.push('CoreUserProfilePage', { userId: this.userId, courseId: this.courseId });
        }
    }
}
