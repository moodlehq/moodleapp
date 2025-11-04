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
import { Component, computed, input, linkedSignal, output } from '@angular/core';
import { Translate } from '@singletons';
import { CoreBaseModule } from '@/core/base.module';
import { CoreProgressBarComponent } from '@components/progress-bar/progress-bar';
import { CoreFaIconDirective } from '@directives/fa-icon';
import { CoreUpdateNonReactiveAttributesDirective } from '@directives/update-non-reactive-attributes';

/**
 * Component to show a "bar" with arrows to navigate forward/backward and an progressbar to see the status.
 *
 * This directive will show two arrows at the left and right of the screen to navigate to previous/next item when clicked.
 * If no previous/next item is defined, that arrow will be disabled.
 *
 * Example usage:
 * <core-navigation-bar [items]="items" (action)="goTo($event)"></core-navigation-bar>
 */
@Component({
    selector: 'core-navigation-bar',
    templateUrl: 'core-navigation-bar.html',
    styleUrl: 'navigation-bar.scss',
    imports: [
        CoreBaseModule,
        CoreUpdateNonReactiveAttributesDirective,
        CoreFaIconDirective,
        CoreProgressBarComponent,
    ],
})
export class CoreNavigationBarComponent {

    readonly items = input<CoreNavigationBarItem[]>([]); // List of items.
    readonly previousTranslate = input('core.previous'); // Previous translatable text, can admit $a variable.
    readonly nextTranslate = input('core.next'); // Next translatable text, can admit $a variable.
    readonly component = input<string>(); // Component the bar belongs to.
    readonly componentId = input<number>(); // Component ID.
    readonly contextLevel = input<ContextLevel>(); // The context level.
    readonly contextInstanceId = input<number>(); // The instance ID related to the context.
    readonly courseId = input<number>(); // Course ID the text belongs to. It can be used to improve performance with filters.
    readonly action = output<unknown>(); // Function to call when arrow is clicked. Will receive as a param the item to load.

    readonly currentIndex = linkedSignal(() => this.items().findIndex(item => item.current));
    readonly progress = computed(() => this.currentIndex() >= 0 ? ((this.currentIndex() + 1) / this.items().length) * 100 : 0);
    readonly progressText = computed(() => this.currentIndex() >= 0 ? `${this.currentIndex() + 1} / ${this.items().length}` : '');

    readonly nextIndex = computed(() => this.currentIndex() >= 0 ?
        this.items().findIndex((item, index) => item.enabled && index > this.currentIndex()) : -1);

    readonly nextTitle = computed(() => this.items()[this.nextIndex()] ?
        Translate.instant(this.nextTranslate(), { $a: this.items()[this.nextIndex()].title || '' }) : '');

    readonly previousIndex = computed(() => {
        const reversedIndex = this.currentIndex() >= 0 ?
            this.items().slice(0, this.currentIndex()).reverse().findIndex(item => item.enabled) : -1;

        return reversedIndex >= 0 ? this.currentIndex() - reversedIndex - 1 : -1;
    });

    readonly previousTitle = computed(() => this.items()[this.previousIndex()] ?
        Translate.instant(this.previousTranslate(), { $a: this.items()[this.previousIndex()].title || '' }) : '');

    /**
     * Navigate to an item.
     *
     * @param itemIndex Selected item index.
     */
    navigate(itemIndex: number): void {
        if (!this.items()[itemIndex].enabled) {
            return;
        }

        this.currentIndex.set(itemIndex);
        this.action.emit(this.items()[itemIndex].item);
    }

}

export type CoreNavigationBarItem<T = unknown> = {
    item: T;
    title?: string;
    current: boolean;
    enabled: boolean;
};
