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

import { ActivatedRoute, ActivatedRouteSnapshot } from '@angular/router';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';

import { CoreSite } from '@classes/sites/site';
import { CoreSites } from '@services/sites';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreUser, CoreUserProfile } from '@features/user/services/user';
import { CoreUserHelper } from '@features/user/services/user-helper';
import {
    CoreUserDelegate,
    CoreUserDelegateContext,
    CoreUserProfileHandlerType,
    CoreUserProfileListActionHandlerData,
    CoreUserProfileListHandlerData,
    CoreUserProfileButtonHandlerData,
} from '@features/user/services/user-delegate';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreNavigator } from '@services/navigator';
import { CoreCourses } from '@features/courses/services/courses';
import { CoreSwipeNavigationItemsManager } from '@classes/items-management/swipe-navigation-items-manager';
import { CoreUserParticipantsSource } from '@features/user/classes/participants-source';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { CoreTime } from '@singletons/time';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { Translate } from '@singletons';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';
import { CORE_USER_PROFILE_REFRESHED } from '@features/user/constants';

@Component({
    selector: 'page-core-user-profile',
    templateUrl: 'profile.html',
    styleUrl: 'profile.scss',
    imports: [
        CoreSharedModule,
    ],
})
export default class CoreUserProfilePage implements OnInit, OnDestroy {

    userLoaded = false;
    isLoadingHandlers = false;
    user?: CoreUserProfile;
    isDeleted = false;
    isSuspended = false;
    isEnrolled = true;
    rolesFormatted?: string;
    listItemHandlers: ListHandlerData[] = [];
    buttonHandlers: ButtonHandlerData[] = [];

    users?: CoreUserSwipeItemsManager;

    protected courseId?: number;
    protected userId!: number;
    protected site!: CoreSite;
    protected obsProfileRefreshed: CoreEventObserver;
    protected subscription?: Subscription;
    protected logView: (user: CoreUserProfile) => void;
    protected route = inject(ActivatedRoute);

    constructor() {
        this.obsProfileRefreshed = CoreEvents.on(CORE_USER_PROFILE_REFRESHED, (data) => {
            if (!this.user || !data.user) {
                return;
            }

            this.user.email = data.user.email;
        }, CoreSites.getCurrentSiteId());

        this.logView = CoreTime.once(async (user) => {
            try {
                await CoreUser.logView(this.userId, this.courseId, user.fullname);
            } catch (error) {
                this.isDeleted = error?.errorcode === 'userdeleted' || error?.errorcode === 'wsaccessuserdeleted';
                this.isSuspended = error?.errorcode === 'wsaccessusersuspended';
                this.isEnrolled = error?.errorcode !== 'notenrolledprofile';
            }
            let extraParams = '';
            if (this.userId !== CoreSites.getCurrentSiteUserId()) {
                const isCourseProfile = this.courseId && this.courseId !== CoreSites.getCurrentSiteHomeId();
                extraParams = `?id=${this.userId}` + (isCourseProfile ? `&course=${this.courseId}` : '');
            }

            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM,
                ws: 'core_user_view_user_profile',
                name: user.fullname + ': ' + Translate.instant('core.publicprofile'),
                data: { id: this.userId, courseid: this.courseId || undefined, category: 'user' },
                url: `/user/profile.php${extraParams}`,
            });
        });
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            this.site = CoreSites.getRequiredCurrentSite();
            this.courseId = CoreNavigator.getRouteNumberParam('courseId');
            this.userId = CoreNavigator.getRequiredRouteNumberParam('userId');
        } catch (error) {
            CoreAlerts.showError(error);
            CoreNavigator.back();

            return;
        }

        if (this.courseId === this.site.getSiteHomeId()) {
            // Get site profile.
            this.courseId = undefined;
        }

        if (this.courseId && CoreNavigator.getRouteData(this.route).swipeManagerSource === 'participants') {
            const search = CoreNavigator.getRouteParam('search');
            const source = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(
                CoreUserParticipantsSource,
                [this.courseId, search],
            );
            this.users = new CoreUserSwipeItemsManager(source);

            this.users.start();
        }

        try {
            await this.fetchUser();
        } finally {
            this.userLoaded = true;
        }
    }

    /**
     * Fetches the user and updates the view.
     */
    async fetchUser(): Promise<void> {
        try {
            const user = await CoreUser.getProfile(this.userId, this.courseId);

            this.rolesFormatted = 'roles' in user ? CoreUserHelper.formatRoleList(user.roles) : '';

            this.user = user;

            // If there's already a subscription, unsubscribe because we'll get a new one.
            this.subscription?.unsubscribe();

            const context = this.courseId ? CoreUserDelegateContext.COURSE : CoreUserDelegateContext.SITE;
            const defaultComponentData = {
                user: this.user,
                context,
                courseId: this.courseId,
            };

            this.subscription = CoreUserDelegate.getProfileHandlersFor(user, context, this.courseId).subscribe((handlers) => {
                this.listItemHandlers = [];
                this.buttonHandlers = [];
                handlers.forEach((handler) => {
                    switch (handler.type) {
                        case CoreUserProfileHandlerType.BUTTON:
                            this.buttonHandlers.push({ name: handler.name, ...handler.data } as ButtonHandlerData);
                            break;
                        case CoreUserProfileHandlerType.LIST_ACCOUNT_ITEM:
                            // Discard this for now.
                            break;
                        case CoreUserProfileHandlerType.LIST_ITEM:
                        default:
                            this.listItemHandlers.push({
                                name: handler.name,
                                ...handler.data,
                                componentData: 'componentData' in handler.data ? {
                                    ...defaultComponentData,
                                    ...(handler.data.componentData || {}),
                                } : undefined,
                            });
                            break;
                    }
                });

                this.isLoadingHandlers = !CoreUserDelegate.areHandlersLoaded(user.id, context, this.courseId);
            });

            this.logView(user);
        } catch (error) {
            // Error is null for deleted users, do not show the modal.
            CoreAlerts.showError(error);
        }
    }

    /**
     * Refresh the user.
     *
     * @param event Event.
     * @returns Promise resolved when done.
     */
    async refreshUser(event?: HTMLIonRefresherElement): Promise<void> {
        await CorePromiseUtils.ignoreErrors(Promise.all([
            CoreUser.invalidateUserCache(this.userId),
            CoreCourses.invalidateUserNavigationOptions(),
            CoreCourses.invalidateUserAdministrationOptions(),
        ]));

        await this.fetchUser();

        event?.complete();

        if (this.user) {
            CoreEvents.trigger(CORE_USER_PROFILE_REFRESHED, {
                courseId: this.courseId,
                userId: this.userId,
                user: this.user,
            }, this.site?.getId());
        }
    }

    /**
     * Open the page with the user details.
     */
    openUserDetails(): void {
        CoreNavigator.navigateToSitePath('user/about', {
            params: {
                courseId: this.courseId,
                userId: this.userId,
            },
        });
    }

    /**
     * A handler was clicked.
     *
     * @param event Click event.
     * @param handler Handler that was clicked.
     */
    handlerClicked(event: Event, handler: CoreUserProfileButtonHandlerData | CoreUserProfileListActionHandlerData): void {
        if (!this.user) {
            return;
        }

        const context = this.courseId ? CoreUserDelegateContext.COURSE : CoreUserDelegateContext.SITE;
        handler.action(event, this.user, context, this.courseId);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.users?.destroy();
        this.subscription?.unsubscribe();
        this.obsProfileRefreshed.off();
    }

}

/**
 * Helper to manage swiping within a collection of users.
 */
class CoreUserSwipeItemsManager extends CoreSwipeNavigationItemsManager {

    /**
     * @inheritdoc
     */
    protected getSelectedItemPathFromRoute(route: ActivatedRouteSnapshot | ActivatedRoute): string | null {
        return CoreNavigator.getRouteParams(route).userId;
    }

}

type ListHandlerData = CoreUserProfileListHandlerData & { name: string };

type ButtonHandlerData = CoreUserProfileButtonHandlerData & { name: string };
