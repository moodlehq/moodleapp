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

import { Component, Input, OnChanges, SimpleChange, ChangeDetectionStrategy } from '@angular/core';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';

/**
 * Component to show a progress bar and its value.
 *
 * Example usage:
 * <core-progress-bar [progress]="percentage"></core-progress-bar>
 */
@Component({
    selector: 'core-progress-bar',
    templateUrl: 'core-progress-bar.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CoreProgressBarComponent implements OnChanges {
    @Input() progress: number | string; // Percentage from 0 to 100.
    @Input() text?: string; // Percentage in text to be shown at the right. If not defined, progress will be used.
    width: SafeStyle;
    protected textSupplied = false;

    constructor(private sanitizer: DomSanitizer) { }

    /**
     * Detect changes on input properties.
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        if (changes.text && typeof changes.text.currentValue != 'undefined') {
            // User provided a custom text, don't use default.
            this.textSupplied = true;
        }

        if (changes.progress) {
            // Progress has changed.
            if (typeof this.progress == 'string') {
                this.progress = parseInt(this.progress, 10);
            }

            if (this.progress < 0 || isNaN(this.progress)) {
                this.progress = -1;
            }

            if (this.progress != -1) {
                // Remove decimals.
                this.progress = Math.floor(this.progress);

                if (!this.textSupplied) {
                    this.text = String(this.progress);
                }

                this.width = this.sanitizer.bypassSecurityTrustStyle(this.progress + '%');
            }
        }
    }
}
