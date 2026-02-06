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

import { Component, computed, EventEmitter, input, OnInit, Output, signal } from '@angular/core';
import { toBoolean } from '@/core/transforms/boolean';
import { CoreBaseModule } from '@/core/base.module';

enum CoreAlertCardType {
    DANGER = 'danger',
    INFO = 'info',
    WARNING = 'warning',
    SUCCESS = 'success',
}

/**
 * Component to show a colored alert card with optional icon and dismiss action.
 */
@Component({
    selector: 'core-alert-card',
    templateUrl: 'alert-card.html',
    styleUrl: 'alert-card.scss',
    imports: [
        CoreBaseModule,
    ],
})
export class CoreAlertCardComponent implements OnInit {

    readonly type = input<CoreAlertCardType>(CoreAlertCardType.WARNING);
    readonly icon = input();
    // New output syntax doesn't have the 'observed' property, keep EventEmitter for now.
    // See https://github.com/angular/angular/issues/54837
    @Output() itemAction = new EventEmitter<() => void>(); // Will emit an event when the item clicked.

    readonly hasAction = signal(false);

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.hasAction.set(this.itemAction.observed);
    }

    /**
     * Compute the icon to use based on the type if not provided.
     */
    protected readonly computedIcon = computed(() => {
        const icon = this.icon();
        if (icon) {
            return icon;
        }
        if (icon === '') {
            return undefined;
        }
        switch (this.normalizedType()) {
            case CoreAlertCardType.DANGER:
                return 'fas-circle-exclamation';
            case CoreAlertCardType.INFO:
                return 'fas-circle-info';
            case CoreAlertCardType.SUCCESS:
                return 'fas-circle-check';
            case CoreAlertCardType.WARNING:
            default:
                return 'fas-triangle-exclamation';
        }
    });

    readonly title = input('');
    readonly message = input('');
    readonly dismissable = input(false, { transform: toBoolean });

    protected readonly dismissed = signal(false);
    protected readonly normalizedType = computed(() => {
        const type = this.type();

        return (Object.values(CoreAlertCardType) as string[]).includes(type)
            ? type
            : CoreAlertCardType.WARNING;
    });

    /**
     * Hide the card.
     *
     * @param event Click event.
     */
    dismiss(event: Event): void {
        event.preventDefault();
        event.stopPropagation();

        this.dismissed.set(true);
    }

}
