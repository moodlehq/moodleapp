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
import { CoreCourse } from '@features/course/services/course';
import { IonContent } from '@ionic/angular';
import { CoreNavigator } from '@services/navigator';
import { CoreTimeUtils } from '@services/utils/time';
import { AddonModChat, AddonModChatChat, AddonModChatProvider } from '../../services/chat';
import { AddonModChatModuleHandlerService } from '../../services/handlers/module';

/**
 * Component that displays a chat.
 */
@Component({
    selector: 'addon-mod-chat-index',
    templateUrl: 'addon-mod-chat-index.html',
})
export class AddonModChatIndexComponent extends CoreCourseModuleMainActivityComponent implements OnInit {

    component = AddonModChatProvider.COMPONENT;
    moduleName = 'chat';
    chat?: AddonModChatChat;
    sessionsAvailable = false;
    chatInfo?: {
        date: string;
        fromnow: string;
    };

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

        if (!this.chat) {
            return;
        }

        try {
            await AddonModChat.logView(this.chat.id, this.chat.name);

            CoreCourse.checkModuleCompletion(this.courseId, this.module.completiondata);
        } catch {
            // Ignore errors.
        }
    }

    /**
     * @inheritdoc
     */
    protected async fetchContent(refresh: boolean = false): Promise<void> {
        try {
            this.chat = await AddonModChat.getChat(this.courseId, this.module.id);

            this.description = this.chat.intro;
            const now = CoreTimeUtils.timestamp();
            const span = (this.chat.chattime || 0) - now;

            if (this.chat.chattime && this.chat.schedule && span > 0) {
                this.chatInfo = {
                    date: CoreTimeUtils.userDate(this.chat.chattime * 1000),
                    fromnow: CoreTimeUtils.formatTime(span),
                };
            } else {
                this.chatInfo = undefined;
            }

            this.dataRetrieved.emit(this.chat);

            this.sessionsAvailable = await AddonModChat.areSessionsAvailable();
        } finally {
            this.fillContextMenu(refresh);
        }
    }

    /**
     * Enter the chat.
     */
    enterChat(): void {
        const title = this.chat?.name || this.moduleName;

        CoreNavigator.navigateToSitePath(
            AddonModChatModuleHandlerService.PAGE_NAME + `/${this.courseId}/${this.module.id}/chat`,
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
            AddonModChatModuleHandlerService.PAGE_NAME + `/${this.courseId}/${this.module.id}/sessions`,
            {
                params: {
                    chatId: this.chat!.id,
                },
            },
        );
    }

}
