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
import { Component, OnDestroy, OnInit, computed, inject, signal, viewChildren } from '@angular/core';
import { Subscription } from 'rxjs';

import { CoreSite } from '@classes/sites/site';
import { CoreSites } from '@services/sites';
import { CoreEventObserver, CoreEvents } from '@static/events';
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
import { CorePromiseUtils } from '@static/promise-utils';
import { CoreNavigator } from '@services/navigator';
import { CoreCourses } from '@features/courses/services/courses';
import { CoreSwipeNavigationItemsManager } from '@classes/items-management/swipe-navigation-items-manager';
import { CoreUserParticipantsSource } from '@features/user/classes/participants-source';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { CoreTime } from '@static/time';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { Translate } from '@singletons';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';
import { CORE_USER_PROFILE_REFRESHED } from '@features/user/constants';
import { CoreDynamicComponent } from '@components/dynamic-component/dynamic-component';
import type { ReloadableComponent } from '@coretypes/reloadable-component';
import { CoreWSError } from '@classes/errors/wserror';

@Component({
    selector: 'page-core-user-profile',
    templateUrl: 'profile.html',
    styleUrl: 'profile.scss',
    imports: [
        CoreSharedModule,
    ],
})
export default class CoreUserProfilePage implements OnInit, OnDestroy {

    readonly dynamicComponents = viewChildren<CoreDynamicComponent<ReloadableComponent>>(CoreDynamicComponent);

    readonly userLoaded = signal(false);
    readonly isLoadingHandlers = signal(false);
    readonly user = signal<CoreUserProfile | undefined>(undefined);

    readonly isDeleted = signal(false);
    readonly isSuspended = signal(false);
    readonly isEnrolled = signal(true);
    readonly cannotViewProfile = signal(false);
    readonly rolesFormatted = computed(() => {
        const user = this.user();
        if (!user) {
            return '';
        }

        return 'roles' in user ? CoreUserHelper.formatRoleList(user.roles) : '';
    });

    readonly listItemHandlers = signal<ListHandlerData[]>([]);
    readonly buttonHandlers = signal<ButtonHandlerData[]>([]);

    readonly users = signal<CoreUserSwipeItemsManager | undefined>(undefined);

    protected courseId?: number;
    protected userId!: number;
    protected site!: CoreSite;
    protected obsProfileRefreshed: CoreEventObserver;
    protected subscription?: Subscription;
    protected logView: (user: CoreUserProfile) => void;
    protected route = inject(ActivatedRoute);

    constructor() {
        this.obsProfileRefreshed = CoreEvents.on(CORE_USER_PROFILE_REFRESHED, (data) => {
            if (!data.user || data.userId !== this.userId) {
                return;
            }

            this.user.set(data.user);
        }, CoreSites.getCurrentSiteId());

        this.logView = CoreTime.once(async (user) => {
            try {
                await CoreUser.logView(this.userId, this.courseId);
            } catch (error) {
                this.isDeleted.set(error?.errorcode === 'userdeleted' || error?.errorcode === 'wsaccessuserdeleted');
                this.isSuspended.set(error?.errorcode === 'wsaccessusersuspended');
                this.isEnrolled.set(error?.errorcode !== 'notenrolledprofile');
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
            const users = new CoreUserSwipeItemsManager(source);
            this.users.set(users);

            users.start();
        }

        try {
            await this.fetchUser();
        } finally {
            this.userLoaded.set(true);
        }
    }

    /**
     * Fetches the user and updates the view.
     */
    async fetchUser(): Promise<void> {
        try {
            const user = await CoreUser.getProfile(this.userId, this.courseId);

            this.user.set(user);

            // If there's already a subscription, unsubscribe because we'll get a new one.
            this.subscription?.unsubscribe();

            const context = this.courseId ? CoreUserDelegateContext.COURSE : CoreUserDelegateContext.SITE;
            const defaultComponentData = {
                user: this.user(),
                context,
                courseId: this.courseId,
            };

            this.subscription = CoreUserDelegate.getProfileHandlersFor(user, context, this.courseId).subscribe((handlers) => {
                const listItemHandlers: ListHandlerData[] = [];
                const buttonHandlers: ButtonHandlerData[] = [];

                handlers.forEach((handler) => {
                    switch (handler.type) {
                        case CoreUserProfileHandlerType.BUTTON:
                            buttonHandlers.push({ name: handler.name, ...handler.data } as ButtonHandlerData);
                            break;
                        case CoreUserProfileHandlerType.LIST_ACCOUNT_ITEM:
                            // Discard this for now.
                            break;
                        case CoreUserProfileHandlerType.LIST_ITEM:
                        default:
                            listItemHandlers.push({
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

                this.listItemHandlers.set(listItemHandlers);
                this.buttonHandlers.set(buttonHandlers);

                this.isLoadingHandlers.set(!CoreUserDelegate.areHandlersLoaded(user.id, context, this.courseId));
            });

            this.logView(user);
        } catch (error) {
            if (error instanceof CoreWSError && error?.errorcode === 'cannotviewprofile') {
                 this.subscription?.unsubscribe();
                 this.subscription = undefined;
                 this.user.set(undefined);
                 this.isLoadingHandlers.set(false);
                 this.cannotViewProfile.set(true);

                return;
            }

            // Error is null for deleted users, do not show the modal.
            CoreAlerts.showError(error);
        }
    }

    /**
     * Refresh the user.
     *
     * @param event Event.
     */
    async refreshUser(event?: HTMLIonRefresherElement): Promise<void> {
        await CorePromiseUtils.ignoreErrors(Promise.all([
            CoreUser.invalidateUserCache(this.userId),
            CoreCourses.invalidateUserNavigationOptions(),
            CoreCourses.invalidateUserAdministrationOptions(),
            ...(this.dynamicComponents()?.map((component) =>
                Promise.resolve(component.callComponentMethod('invalidateContent'))) || []),
        ]));

        await this.fetchUser();

        await CorePromiseUtils.allPromisesIgnoringErrors(
            this.dynamicComponents()?.map((component) => Promise.resolve(component.callComponentMethod('reloadContent'))),
        );

        event?.complete();

        if (this.user()) {
            CoreEvents.trigger(CORE_USER_PROFILE_REFRESHED, {
                courseId: this.courseId,
                userId: this.userId,
                user: this.user(),
            }, this.site?.getId());
        }
    }

    /**
     * A handler was clicked.
     *
     * @param event Click event.
     * @param handler Handler that was clicked.
     */
    handlerClicked(event: Event, handler: CoreUserProfileButtonHandlerData | CoreUserProfileListActionHandlerData): void {
        const user = this.user();
        if (!user) {
            return;
        }

        const context = this.courseId ? CoreUserDelegateContext.COURSE : CoreUserDelegateContext.SITE;
        handler.action(event, user, context, this.courseId);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.users()?.destroy();
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
