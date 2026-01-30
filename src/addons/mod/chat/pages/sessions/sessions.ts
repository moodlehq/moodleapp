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

import { AfterViewInit, Component, OnDestroy, OnInit, viewChild } from '@angular/core';
import { CoreListItemsManager } from '@classes/items-management/list-items-manager';
import { CoreRoutedItemsManagerSourcesTracker } from '@classes/items-management/routed-items-manager-sources-tracker';
import { CoreSplitViewComponent } from '@components/split-view/split-view';
import { CoreGroupInfo } from '@services/groups';
import { CoreNavigator } from '@services/navigator';
import { AddonModChatSessionFormatted, AddonModChatSessionsSource } from '../../classes/chat-sessions-source';
import { CoreAnalytics, CoreAnalyticsEventType } from '@services/analytics';
import { CoreTime } from '@static/time';
import { Translate } from '@singletons';
import { AddonModChat } from '@addons/mod/chat/services/chat';
import { CorePromiseUtils } from '@static/promise-utils';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page that displays list of chat sessions.
 */
@Component({
    selector: 'page-addon-mod-chat-sessions',
    templateUrl: 'sessions.html',
    imports: [
        CoreSharedModule,
    ],
})
export default class AddonModChatSessionsPage implements OnInit, AfterViewInit, OnDestroy {

    readonly splitView = viewChild.required(CoreSplitViewComponent);

    sessions!: CoreListItemsManager<AddonModChatSessionFormatted, AddonModChatSessionsSource>;
    courseId?: number;
    protected logView: () => void;

    constructor() {
        this.logView = CoreTime.once(async () => {
            const source = this.sessions.getSource();

            await CorePromiseUtils.ignoreErrors(AddonModChat.logViewSessions(this.sessions.getSource().cmId));

            CoreAnalytics.logEvent({
                type: CoreAnalyticsEventType.VIEW_ITEM_LIST,
                ws: 'mod_chat_view_sessions',
                name: Translate.instant('addon.mod_chat.chatreport'),
                data: { chatid: source.chatId, category: 'chat' },
                url: `/mod/chat/report.php?id=${source.cmId}`,
            });
        });
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        try {
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            const chatId = CoreNavigator.getRequiredRouteNumberParam('chatId');
            const cmId = CoreNavigator.getRequiredRouteNumberParam('cmId');
            const source = CoreRoutedItemsManagerSourcesTracker.getOrCreateSource(
                AddonModChatSessionsSource,
                [this.courseId, chatId, cmId],
            );

            this.sessions = new CoreListItemsManager(source, AddonModChatSessionsPage);
        } catch (error) {
            CoreAlerts.showError(error);
            CoreNavigator.back();

            return;
        }
    }

    get groupId(): number {
        return this.sessions.getSource().groupId;
    }

    set groupId(value: number) {
        this.sessions.getSource().groupId = value;
    }

    get showAll(): boolean {
        return this.sessions.getSource().showAll;
    }

    set showAll(value: boolean) {
        this.sessions.getSource().showAll = value;
    }

    get groupInfo(): CoreGroupInfo | undefined {
        return this.sessions.getSource().groupInfo;
    }

    /**
     * @inheritdoc
     */
    async ngAfterViewInit(): Promise<void> {
        await this.fetchSessions();

        this.sessions.start(this.splitView());
    }

    /**
     * Fetch chat sessions.
     */
    async fetchSessions(): Promise<void> {
        try {
            await this.sessions.load();

            this.logView();
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('core.errorloadingcontent') });
        }
    }

    /**
     * Reload chat sessions.
     */
    async reloadSessions(): Promise<void> {
        const modal = await CoreLoadings.show();

        try {
            await this.sessions.reload();
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('core.errorloadingcontent') });
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Refresh chat sessions.
     *
     * @param refresher Refresher.
     */
    async refreshSessions(refresher: HTMLIonRefresherElement): Promise<void> {
        try {
            this.sessions.getSource().setDirty(true);

            await this.sessions.getSource().invalidateCache();
            await this.fetchSessions();
        } finally {
            refresher.complete();
        }
    }

    /**
     * Show more session users.
     *
     * @param session Chat session.
     * @param event The event.
     */
    showMoreUsers(session: AddonModChatSessionFormatted, event: Event): void {
        if (session.allsessionusers) {
            session.sessionusers = session.allsessionusers;
        }

        event.stopPropagation();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.sessions.destroy();
    }

}
