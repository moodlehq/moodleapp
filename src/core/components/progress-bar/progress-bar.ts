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

import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { Translate } from '@singletons';
import { CoreBaseModule } from '@/core/base.module';

/**
 * Component to show a progress bar and its value.
 *
 * Example usage:
 * <core-progress-bar [progress]="percentage"></core-progress-bar>
 */
@Component({
    selector: 'core-progress-bar',
    templateUrl: 'core-progress-bar.html',
    styleUrl: 'progress-bar.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CoreBaseModule],
    host: {
        '[class]': 'color() ? `ion-color ion-color-${color()}` : ""',
    },
})
export class CoreProgressBarComponent {

    readonly progress = input.required<number | string>(); // Percentage (0 to 100). Negative number will show an indeterminate bar.
    readonly text = input<string>(); // Percentage in text to be shown at the right. If not defined, progress will be used.
    readonly a11yText = input<string>(); // Accessibility text to read before the percentage.
    readonly ariaDescribedBy = input<string>(); // ID of the element that described the progress, if any.
    readonly color = input('');

    readonly progressNumber = computed(() => {
        const progress = Number(this.progress());

        return progress < 0 || isNaN(progress) ? -1 : Math.floor(progress); // Remove decimals if progress is valid.
    });

    readonly textToDisplay = computed(() => this.text() ??
        (this.progressNumber() !== -1 ? Translate.instant('core.percentagenumber', { $a: this.progressNumber() }) : ''));

    readonly progressBarValueText = computed(() =>
        (this.a11yText() ? Translate.instant(this.a11yText() ?? '') + ' ' : '') + this.textToDisplay());

}
