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

import { Component, OnDestroy, signal, computed, input, linkedSignal } from '@angular/core';

import { CoreSiteBasicInfo, CoreSites } from '@services/sites';
import { CoreUtils } from '@static/utils';
import { CoreEventObserver, CoreEvents } from '@static/events';
import { CoreUser, CoreUserBasicData } from '@features/user/services/user';
import { CoreNavigator } from '@services/navigator';
import { CoreNetwork } from '@services/network';
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
 * - user: User data. See CoreUserWithAvatar type for all possible formats.
 * - linkProfile: Whether to link the avatar to the user profile. If true, will navigate to the user's profile page on click.
 * - courseId: Course ID. If linkProfile is true, it will be used to link the image to the profile in that course.
 * - checkOnline: Whether to check if the user is online or not. If true, it will show an online status.
 * - siteId: Site ID. It will be used to link image external content. Current site will be used if not provided.
 *
 * Deprecated inputs:
 * - userId: User ID. It will be used to link the image to the profile if linkProfile is true.
 * - fullname: User's full name. It will be used as alt text for the image and to calculate initials if needed.
 * - profileUrl: URL of the avatar image.
 * - site: Site info. It should contain user info but it's deprecated. Use user object instead.
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
export class CoreUserAvatarComponent implements OnDestroy {

    readonly user = input<CoreUserWithAvatar>();
    readonly linkProfile = input(true, { transform: toBoolean }); // Avoid linking to the profile if wanted.
    readonly courseId = input<number>();
    readonly checkOnline = input(false, { transform: toBoolean }); // If want to check and show online status.
    readonly siteId = input<string>();

    readonly courseIdEffective = computed(() => this.courseId() ?? this.user()?.courseid);

    /** @deprecated since 5.3 Use id or userid in user object instead */
    readonly userId = input<number>(); // If provided or found it will be used to link the image to the profile.

    readonly userIdEffective = computed(() => {
        const user = this.user();
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        const site = this.site();

        // eslint-disable-next-line @typescript-eslint/no-deprecated
        return this.userId() || user?.userid || user?.id || // Take user.userid over user.id because it should be more reliable.
            site?.userid || CoreSites.getCurrentSiteUserId();
    });

    /** @deprecated since 5.3 Use fullname in user object instead */
    readonly fullname = input<string>();

    readonly fullnameEffective = computed(() => {
        const user = this.user();

        // eslint-disable-next-line @typescript-eslint/no-deprecated
        return this.fullname() ?? user?.fullname ?? user?.userfullname ?? this.site()?.fullname ?? '';
    });

    /** @deprecated since 5.3 Use profileimageurl in user object instead */
    readonly profileUrl = input<string>();

    readonly imageUrl = linkedSignal<string | undefined>(() => {
        const user = this.user();

        // eslint-disable-next-line @typescript-eslint/no-deprecated
        const profileUrl = this.profileUrl() ||user?.profileimageurl || user?.userprofileimageurl ||
            user?.userpictureurl || user?.profileimageurlsmall || user?.urls?.profileimage ||
            // eslint-disable-next-line @typescript-eslint/no-deprecated
            this.site()?.userpictureurl;

        if (typeof profileUrl !== 'string') {
            return undefined;
        }

        if (profileUrl && CoreUrl.isThemeImageUrl(profileUrl)) {
            return undefined;
        }

        return profileUrl;
    });

    /** @deprecated since 5.3 Use user object instead */
    readonly site = input<CoreSiteBasicInfo | CoreSiteInfo>();

    readonly siteIdEffective = computed(() => {
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        const site = this.site();
        const siteId = this.siteId();

        return siteId ?? (site && 'id' in site
            ? site.id
            : CoreSites.getCurrentSiteId());
    });

    readonly imageError = signal<boolean>(false);

    // Initials calculation inputs.
    readonly initials = computed(() => {
        const user = this.user();
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        const site = this.site();

        return this.user()?.initials ??
            this.user()?.userinitials ??
            CoreUser.getUserInitials({
                firstname: user?.firstname ?? site?.firstname,
                lastname: user?.lastname ?? site?.lastname,
                fullname: this.fullnameEffective(),
            });
    });

    readonly showIsOnlineBadge = computed(() => {
        const checkOnline = this.checkOnline();

        if (!checkOnline) {
            return false;
        }

        const user = this.user();

        const isOnline = user?.isonline;
        const lastAccess = user?.lastaccess;

        if (CoreUtils.isFalseOrZero(isOnline)) {
            return false;
        }

        if (lastAccess) {
            // If the time has passed, don't show the online status.
            const time = Date.now() - this.timetoshowusers;

            return lastAccess * 1000 >= time;
        } else {
            // You have to have Internet access first.
            return !!isOnline && CoreNetwork.isOnline();
        }
    });

    // Variable to check if we consider this user online or not.
    // @todo Use setting when available (see MDL-63972) so we can use site setting.
    protected timetoshowusers = 300000; // Miliseconds default.
    protected pictureObserver: CoreEventObserver;

    constructor() {
        this.pictureObserver = CoreEvents.on(
            CORE_USER_PROFILE_PICTURE_UPDATED,
            (data) => {
                if (data.userId === this.userIdEffective()) {
                    this.imageUrl.set(data.picture);
                }
            },
            this.siteIdEffective(),
        );
    }

    /**
     * Avatar image loading handler.
     *
     * @param success Whether the image was loaded successfully or not.
     */
    imageLoaded(success: boolean): void {
        this.imageError.set(!success);
    }

    /**
     * Go to user profile.
     *
     * @param event Click event.
     */
    gotoProfile(event: Event): void {
        const userId = this.userIdEffective();

        if (!this.linkProfile() || !userId) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        CoreNavigator.navigateToSitePath('user', {
            params: {
                userId,
                courseId: this.courseIdEffective(),
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
    userinitials?: string; // @since 5.3 The initials of the user.
};
