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

import { Component, Input, OnInit, OnChanges, OnDestroy, SimpleChange } from '@angular/core';

import { CoreSiteBasicInfo, CoreSites } from '@services/sites';
import { CoreUtils } from '@static/utils';
import { CoreEventObserver, CoreEvents } from '@static/events';
import { CoreUserBasicData } from '@features/user/services/user';
import { CoreNavigator } from '@services/navigator';
import { CoreNetwork } from '@services/network';
import { CoreUserHelper } from '@features/user/services/user-helper';
import { CoreUrl } from '@static/url';
import { CoreSiteInfo } from '@classes/sites/unauthenticated-site';
import { toBoolean } from '@/core/transforms/boolean';
import { CoreBaseModule } from '@/core/base.module';
import { CoreExternalContentDirective } from '@directives/external-content';
import { CoreAriaButtonClickDirective } from '@directives/aria-button';
import { CORE_USER_PROFILE_PICTURE_UPDATED } from '@features/user/constants';

/**
 * Component to display a "user avatar".
 *
 * Main inputs:
 * - url: URL of the avatar image. If not provided, initials will be shown.
 * - userId: User ID. It will be used to link the image to the profile if linkProfile is true.
 * - siteId: Site ID. It will be used to link image external content. Current site will be used if not provided.
 * - fullname: User's full name. It will be used as alt text for the image and to calculate initials if needed.
 * - courseId: Course ID. If linkProfile is true, it will be used to link the image to the profile in that course.
 *
 * Initials calculation inputs (if image url is not provided or fails to load):
 * - initials: User's initials. It will be used if provided, otherwise it will be calculated from the name.
 * - firstname: User's first name. It will be used to calculate initials if needed.
 * - lastname: User's last name. It will be used to calculate initials if needed.
 *
 * Online status inputs:
 * - checkOnline: Whether to check if the user is online or not. If true, it will show an online status.
 * - isOnline: Whether the user is online or not. It will be used together with lastAccess to determine the online status.
 * - lastAccess: User's last access time. It will be used together with isOnline to determine if the user is considered online.
 *
 * Deprecated inputs:
 * - profileUrl: URL of the avatar image. Deprecated, use url instead.
 * - site: Site info. It can contain user info, so it can be used to get the avatar URL and full name if not provided separately.
 * - user: User data. It can be used to get the avatar URL and full name if not provided separately.
 */
@Component({
    selector: 'core-user-avatar',
    templateUrl: 'core-user-avatar.html',
    styleUrl: 'user-avatar.scss',
    imports: [
        CoreBaseModule,
        CoreExternalContentDirective,
        CoreAriaButtonClickDirective,
    ],
})
export class CoreUserAvatarComponent implements OnInit, OnChanges, OnDestroy {

    // Main inputs.
    @Input() url?: string; // URL of the avatar image. If not provided, initials will be shown.
    @Input() userId?: number; // If provided or found it will be used to link the image to the profile.
    @Input() siteId?: string;
    @Input() fullname?: string;
    @Input() courseId?: number;
    @Input({ transform: toBoolean }) linkProfile = true; // Avoid linking to the profile if wanted.

    // Initials calculation inputs.
    @Input() initials?: string;
    @Input() firstname?: string;
    @Input() lastname?: string;

    // Online status inputs.
    @Input({ transform: toBoolean }) checkOnline = false; // If want to check and show online status.
    @Input() isOnline?: boolean;
    @Input() lastAccess?: number;

    // Deprecated inputs.
    /** @deprecated since 5.3 Use url instead. */
    @Input() profileUrl?: string;
    /** @deprecated since 5.3 Pass data using separate inputs instead. */
    @Input() site?: CoreSiteBasicInfo | CoreSiteInfo;
    /** @deprecated since 5.3 Use separate data inputs instead. */
    @Input() user?: CoreUserWithAvatar;

    avatarUrl?: string;
    imageError = false;

    // Variable to check if we consider this user online or not.
    // @todo Use setting when available (see MDL-63972) so we can use site setting.
    protected timetoshowusers = 300000; // Miliseconds default.
    protected currentUserId: number;
    protected pictureObserver: CoreEventObserver;

    constructor() {
        this.currentUserId = CoreSites.getCurrentSiteUserId();

        this.pictureObserver = CoreEvents.on(
            CORE_USER_PROFILE_PICTURE_UPDATED,
            (data) => {
                if (data.userId === this.userId) {
                    this.avatarUrl = data.picture;
                }
            },
            CoreSites.getCurrentSiteId(),
        );
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        const site = this.site; // eslint-disable-line @typescript-eslint/no-deprecated
        const user = this.user; // eslint-disable-line @typescript-eslint/no-deprecated

        this.siteId = this.siteId ?? (site && 'id' in site
            ? site.id
            : CoreSites.getCurrentSiteId());

        if (site && !user) {
            this.user = { // eslint-disable-line @typescript-eslint/no-deprecated
                id: ('userid' in site
                    ? site.userid
                    : site.userId)
                    ?? (await CoreSites.getSite(this.siteId)).getUserId(),
                fullname: site.fullname ?? '',
                firstname: site.firstname ?? '',
                lastname: site.lastname ?? '',
                profileimageurl: site.userpictureurl ?? '',
            };
        }

        this.setFields();
    }

    /**
     * @inheritdoc
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        // If something change, update the fields.
        if (changes) {
            this.setFields();
        }
    }

    /**
     * Avatar image loading handler.
     *
     * @param success Whether the image was loaded successfully or not.
     */
    imageLoaded(success: boolean): void {
        this.imageError = !success;
    }

    /**
     * Set fields from user.
     */
    protected async setFields(): Promise<void> {
        const user = this.user; // eslint-disable-line @typescript-eslint/no-deprecated

        // eslint-disable-next-line @typescript-eslint/no-deprecated
        const profileUrl = this.url || this.profileUrl || user?.profileimageurl || user?.userprofileimageurl ||
            user?.userpictureurl || user?.profileimageurlsmall || user?.urls?.profileimage;

        if (typeof profileUrl === 'string') {
            this.avatarUrl = profileUrl;
        }

        this.fullname = this.fullname || user?.fullname || user?.userfullname;

        if (this.avatarUrl && CoreUrl.isThemeImageUrl(this.avatarUrl)) {
            this.avatarUrl = undefined;
        }

        this.userId = this.userId || user?.userid || user?.id;
        this.courseId = this.courseId || user?.courseid;

        this.initials = this.initials ??
            await CoreUserHelper.getUserInitialsFromParts({
                firstname: this.firstname ?? user?.firstname,
                lastname: this.lastname ?? user?.lastname,
                fullname: this.fullname,
                userId: this.userId,
            });
    }

    /**
     * Helper function for checking the time meets the 'online' condition.
     *
     * @returns boolean
     */
    computeIsOnline(): boolean {
        const user = this.user; // eslint-disable-line @typescript-eslint/no-deprecated
        const isOnline = this.isOnline ?? user?.isonline;
        const lastaccess = this.lastAccess ?? user?.lastaccess;

        if (CoreUtils.isFalseOrZero(isOnline)) {
            return false;
        }

        if (lastaccess) {
            // If the time has passed, don't show the online status.
            const time = Date.now() - this.timetoshowusers;

            return lastaccess * 1000 >= time;
        } else {
            // You have to have Internet access first.
            return !!isOnline && CoreNetwork.isOnline();
        }
    }

    /**
     * Go to user profile.
     *
     * @param event Click event.
     */
    gotoProfile(event: Event): void {
        if (!this.linkProfile || !this.userId) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        CoreNavigator.navigateToSitePath('user', {
            params: {
                userId: this.userId,
                courseId: this.courseId,
            },
        });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.pictureObserver.off();
    }

}

/**
 * Type with all possible formats of user.
 */
export type CoreUserWithAvatar = CoreUserBasicData & {
    userpictureurl?: string;
    userprofileimageurl?: string;
    profileimageurlsmall?: string;
    urls?: {
        profileimage?: string;
    };
    userfullname?: string;
    userid?: number;
    isonline?: boolean;
    courseid?: number;
    lastaccess?: number;
    firstname?: string; // The first name(s) of the user.
    lastname?: string; // The family name of the user.
    initials?: string; // @since 5.3 The initials of the user.
};
