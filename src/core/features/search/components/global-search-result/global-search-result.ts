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

import { toBoolean } from '@/core/transforms/boolean';
import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CoreSearchGlobalSearchResult, CoreSearchGlobalSearchResultContext } from '@features/search/services/global-search';
import { CoreSharedModule } from '@/core/shared.module';

@Component({
    selector: 'core-search-global-search-result',
    templateUrl: 'global-search-result.html',
    styleUrl: './global-search-result.scss',
    imports: [
        CoreSharedModule,
    ],
})
export class CoreSearchGlobalSearchResultComponent implements OnChanges {

    @Input({ required: true }) result!: CoreSearchGlobalSearchResult;
    @Input({ transform: toBoolean }) showCourse = true;

    renderedContext: CoreSearchGlobalSearchResultContext | null = null;
    renderedIcon: string | null = null;

    @Output() onClick = new EventEmitter();

    /**
     * @inheritdoc
     */
    ngOnChanges(): void {
        this.renderedContext = this.computeRenderedContext();
        this.renderedIcon = this.computeRenderedIcon();
    }

    /**
     * Calculate the value of the context to render.
     *
     * @returns Rendered context.
     */
    private computeRenderedContext(): CoreSearchGlobalSearchResultContext | null {
        const context = { ...this.result.context };

        if (!this.showCourse) {
            delete context.courseName;
        }

        return Object.keys(context).length > 0 ? context : null;
    }

    /**
     * Calculate the value of the icon to render.
     *
     * @returns Rendered icon.
     */
    private computeRenderedIcon(): string | null {
        return this.result.module?.name === 'forum'  && this.result.module.area === 'post'
            ? 'fas-message'
            : null;
    }

}
