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

import { ContextLevel } from '@/core/constants';
import { Component, computed, input, output } from '@angular/core';
import { CoreAnimations } from '@components/animations';
import { CoreSites } from '@services/sites';
import { CoreText } from '@singletons/text';
import { CoreUserAvatarComponent, CoreUserWithAvatar } from '@components/user-avatar/user-avatar';
import { toBoolean } from '@/core/transforms/boolean';
import { CoreBaseModule } from '@/core/base.module';
import { CoreFaIconDirective } from '@directives/fa-icon';
import { CoreFormatTextDirective } from '@directives/format-text';
import { CoreLongPressDirective } from '@directives/long-press';
import { CoreUpdateNonReactiveAttributesDirective } from '@directives/update-non-reactive-attributes';
import { CoreFormatDatePipe } from '@pipes/format-date';

/**
 * Component to handle a message in a conversation.
 */
@Component({
    selector: 'core-message',
    templateUrl: 'message.html',
    styleUrl: 'message.scss',
    animations: [CoreAnimations.SLIDE_IN_OUT],
    imports: [
        CoreBaseModule,
        CoreLongPressDirective,
        CoreUserAvatarComponent,
        CoreFormatTextDirective,
        CoreFaIconDirective,
        CoreUpdateNonReactiveAttributesDirective,
        CoreFormatDatePipe,
    ],
    host: {
        '[@coreSlideInOut]': 'isMine() ? "" : "fromLeft"',
        '[class.is-mine]': 'isMine()',
        '[class.no-user]': '!message()?.showUserData',
    },
})
export class CoreMessageComponent {

    readonly message = input<CoreMessageData>(); // The message object.
    readonly user = input<CoreUserWithAvatar>(); // The user object.

    readonly text = input(''); // Message text.
    readonly time = input(0); // Message time.
    readonly instanceId = input(0);
    readonly courseId = input<number>();
    readonly contextLevel = input<ContextLevel>(ContextLevel.SYSTEM);
    readonly showDelete = input(false, { transform: toBoolean });
    readonly onDeleteMessage = output<void>();
    readonly onUndoDeleteMessage = output<void>();
    readonly afterRender = output<void>();

    readonly userFullname = computed(() => this.user()?.fullname || this.user()?.userfullname);

    protected readonly userId = computed(() => this.user()?.userid || this.user()?.id);
    protected readonly isMine = computed(() => this.userId() === CoreSites.getCurrentSiteUserId());

    /**
     * Emits the delete action.
     *
     * @param event Event.
     */
    delete(event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        this.onDeleteMessage.emit();
    }

    /**
     * Emits the undo delete action.
     *
     * @param event Event.
     */
    undoDelete(event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        this.onUndoDeleteMessage.emit();

    }

    /**
     * Copy message to clipboard.
     */
    copyMessage(): void {
        CoreText.copyToClipboard(CoreText.decodeHTMLEntities(this.text()));
    }

}

/**
 * Conversation message with some calculated data.
 *
 * @todo: The properties that are used in the template should be signals, otherwise if they change the template might not
 * update in some cases. E.g. showTail, pending, deleted, etc.
 */
type CoreMessageData = {
    pending?: boolean; // Whether the message is pending to be sent.
    sending?: boolean; // Whether the message is being sent right now.
    showDate?: boolean; // Whether to show the date before the message.
    deleted?: boolean; // Whether the message has been deleted.
    showUserData?: boolean; // Whether to show the user data in the message.
    showTail?: boolean; // Whether to show a "tail" in the message.
    delete?: boolean; // Permission to delete=true/false.
};
