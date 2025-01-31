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
import { Component, EventEmitter, HostBinding, Input, OnInit, Output } from '@angular/core';
import { CoreAnimations } from '@components/animations';
import { CoreSites } from '@services/sites';
import { CoreText } from '@singletons/text';
import { CoreUserWithAvatar } from '@components/user-avatar/user-avatar';
import { toBoolean } from '@/core/transforms/boolean';
import { CoreFormatDatePipe } from '../../pipes/format-date';
import { TranslateModule } from '@ngx-translate/core';
import { CoreUpdateNonReactiveAttributesDirective } from '../../directives/update-non-reactive-attributes';
import { CoreFaIconDirective } from '../../directives/fa-icon';
import { IonicModule } from '@ionic/angular';
import { CoreFormatTextDirective } from '../../directives/format-text';
import { CoreUserAvatarComponent } from '../user-avatar/user-avatar';
import { CoreLongPressDirective } from '../../directives/long-press';

/**
 * Component to handle a message in a conversation.
 */
@Component({
    selector: 'core-message',
    templateUrl: 'message.html',
    styleUrl: 'message.scss',
    animations: [CoreAnimations.SLIDE_IN_OUT],
    standalone: true,
    imports: [
        CoreLongPressDirective,
        CoreUserAvatarComponent,
        CoreFormatTextDirective,
        IonicModule,
        CoreFaIconDirective,
        CoreUpdateNonReactiveAttributesDirective,
        TranslateModule,
        CoreFormatDatePipe,
    ],
})
export class CoreMessageComponent implements OnInit {

    @Input() message?: CoreMessageData; // The message object.
    @Input() user?: CoreUserWithAvatar; // The user object.

    @Input() text = ''; // Message text.
    @Input() time = 0; // Message time.
    @Input() instanceId = 0;
    @Input() courseId?: number;
    @Input() contextLevel: ContextLevel = ContextLevel.SYSTEM;
    @Input({ transform: toBoolean }) showDelete = false;
    @Output() onDeleteMessage = new EventEmitter<void>();
    @Output() onUndoDeleteMessage = new EventEmitter<void>();
    @Output() afterRender = new EventEmitter<void>();

    protected deleted = false; // Needed to fix animation to void in Behat tests.

    @HostBinding('@coreSlideInOut') get animation(): string {
        return this.isMine ? '' : 'fromLeft';
    }

    @HostBinding('class.is-mine') isMine = false;

    @HostBinding('class.no-user') get showUser(): boolean {
        return !this.message?.showUserData;
    }

    get userId(): number | undefined {
        return this.user && (this.user.userid || this.user.id);
    }

    get userFullname(): string | undefined {
        return this.user && (this.user.fullname || this.user.userfullname);
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        const currentUserId = CoreSites.getCurrentSiteUserId();

        this.isMine = this.userId === currentUserId;
    }

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
        CoreText.copyToClipboard(CoreText.decodeHTMLEntities(this.text));
    }

}

/**
 * Conversation message with some calculated data.
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
