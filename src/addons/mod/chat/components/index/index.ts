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

import { Component, OnInit, Optional } from '@angular/core';
import { CoreCourseModuleMainActivityComponent } from '@features/course/classes/main-activity-component';
import { CoreCourseContentsPage } from '@features/course/pages/contents/contents';
import { IonContent } from '@ionic/angular';
import { CoreNavigator } from '@services/navigator';
import { CoreTimeUtils } from '@services/utils/time';
import { CoreTime } from '@singletons/time';
import { AddonModChat, AddonModChatChat } from '../../services/chat';
import { ADDON_MOD_CHAT_COMPONENT, ADDON_MOD_CHAT_PAGE_NAME } from '../../constants';
import { CoreCourseComponentsModule } from '@features/course/components/components.module';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Component that displays a chat.
 */
@Component({
    selector: 'addon-mod-chat-index',
    templateUrl: 'addon-mod-chat-index.html',
    standalone: true,
    imports: [
        CoreSharedModule,
        CoreCourseComponentsModule,
    ],
})
export class AddonModChatIndexComponent extends CoreCourseModuleMainActivityComponent implements OnInit {

    component = ADDON_MOD_CHAT_COMPONENT;
    pluginName = 'chat';
    chat?: AddonModChatChat;
    chatTime?: string;

    constructor(
        protected content?: IonContent,
        @Optional() courseContentsPage?: CoreCourseContentsPage,
    ) {
        super('AddonModChatIndexComponent', content, courseContentsPage);
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        super.ngOnInit();

        await this.loadContent();
    }

    /**
     * @inheritdoc
     */
    protected async fetchContent(): Promise<void> {
        this.chat = await AddonModChat.getChat(this.courseId, this.module.id);

        this.description = this.chat.intro;
        const chatTimeSeconds = (this.chat.chattime || 0) - CoreTimeUtils.timestamp();

        this.chatTime = this.chat.schedule && chatTimeSeconds > 0
            ? CoreTime.formatTime(chatTimeSeconds)
            : undefined;

        this.dataRetrieved.emit(this.chat);
    }

    /**
     * @inheritdoc
     */
    protected async logActivity(): Promise<void> {
        if (!this.chat) {
            return; // Shouldn't happen.
        }

        await AddonModChat.logView(this.chat.id);

        this.analyticsLogEvent('mod_chat_view_chat');
    }

    /**
     * Enter the chat.
     */
    enterChat(): void {
        const title = this.chat?.name || this.moduleName;

        CoreNavigator.navigateToSitePath(
            `${ADDON_MOD_CHAT_PAGE_NAME}/${this.courseId}/${this.module.id}/chat`,
            {
                params: {
                    title,
                    chatId: this.chat!.id,
                },
            },
        );
    }

    /**
     * View past sessions.
     */
    viewSessions(): void {
        CoreNavigator.navigateToSitePath(
            `${ADDON_MOD_CHAT_PAGE_NAME}/${this.courseId}/${this.module.id}/sessions`,
            {
                params: {
                    chatId: this.chat!.id,
                },
            },
        );
    }

}
