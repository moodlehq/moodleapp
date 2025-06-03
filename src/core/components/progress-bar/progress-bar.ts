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

import { Component, Input, OnChanges, SimpleChange, ChangeDetectionStrategy, ElementRef } from '@angular/core';
import { SafeStyle } from '@angular/platform-browser';
import { DomSanitizer, Translate } from '@singletons';
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
})
export class CoreProgressBarComponent implements OnChanges {

    @Input({ required: true }) progress!: number | string; // Percentage (0 to 100). Negative number will show an indeterminate bar.
    @Input() text?: string; // Percentage in text to be shown at the right. If not defined, progress will be used.
    @Input() a11yText?: string; // Accessibility text to read before the percentage.
    @Input() ariaDescribedBy?: string; // ID of the element that described the progress, if any.
    @Input() color = '';

    width?: SafeStyle;
    progressBarValueText?: string;
    progressNumber = 0;

    protected textSupplied = false;
    protected element: HTMLElement;

    constructor(elementRef: ElementRef) {
        this.element = elementRef.nativeElement;
    }

    /**
     * @inheritdoc
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        if (changes.color) {
            if (changes.color.previousValue) {
                this.element.classList.remove('ion-color', `ion-color-${changes.color.previousValue}`);
            }
            if (changes.color.currentValue) {
                this.element.classList.add('ion-color', `ion-color-${changes.color.currentValue}`);
            }
        }

        if (changes.text && changes.text.currentValue !== undefined) {
            // User provided a custom text, don't use default.
            this.textSupplied = true;
        }

        if (changes.progress) {
            // Progress has changed.
            this.updateProgress();
        }

        if (changes.text || changes.progress || changes.a11yText) {
            this.progressBarValueText = (this.a11yText ? Translate.instant(this.a11yText) + ' ' : '') + this.text;
        }
    }

    /**
     * Update progress because it has changed.
     */
    protected updateProgress(): void {
        // Progress has changed.
        this.progressNumber = Number(this.progress);

        if (this.progressNumber < 0 || isNaN(this.progressNumber)) {
            this.progressNumber = -1;

            return;
        }

        // Remove decimals.
        this.progressNumber = Math.floor(this.progressNumber);

        if (!this.textSupplied) {
            this.text = Translate.instant('core.percentagenumber', { $a: this.progressNumber });
        }

        this.width = DomSanitizer.bypassSecurityTrustStyle(`${this.progressNumber}%`);
    }

}
