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

import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreSearchHistoryProvider, CoreSearchHistoryItem } from '../../providers/search-history';

/**
 * Component to display a "search box".
 *
 * @description
 * This component will display a standalone search box with its search button in order to have a better UX.
 *
 * Example usage:
 * <core-search-box (onSubmit)="search($event)" [placeholder]="'core.courses.search' | translate"
 *     [searchLabel]="'core.courses.search' | translate" autoFocus="true"></core-search-box>
 */
@Component({
    selector: 'core-search-box',
    templateUrl: 'core-search-box.html'
})
export class CoreSearchBoxComponent implements OnInit {
    @Input() searchLabel?: string; // Label to be used on action button.
    @Input() placeholder?: string; // Placeholder text for search text input.
    @Input() autocorrect = 'on'; // Enables/disable Autocorrection on search text input.
    @Input() spellcheck?: string | boolean = true; // Enables/disable Spellchecker on search text input.
    @Input() autoFocus?: string | boolean; // Enables/disable Autofocus when entering view.
    @Input() lengthCheck = 3; // Check value length before submit. If 0, any string will be submitted.
    @Input() showClear = true; // Show/hide clear button.
    @Input() disabled = false; // Disables the input text.
    @Input() protected initialSearch: string; // Initial search text.
    @Input() protected searchArea?: string; // If provided. It will save and display a history of searches for this particular Id.
                                  // To use different history lists, place different Id.
                                  // I.e. AddonMessagesContacts or CoreUserParticipants-6 (using the course Id).
    @Output() onSubmit: EventEmitter<string>; // Send data when submitting the search form.
    @Output() onClear: EventEmitter<void>; // Send event when clearing the search form.

    @ViewChild('searchForm') formElement: ElementRef;

    searched = ''; // Last search emitted.
    searchText = '';
    history: CoreSearchHistoryItem[] = [];
    historyShown = false;

    constructor(protected translate: TranslateService,
            protected utils: CoreUtilsProvider,
            protected searchHistoryProvider: CoreSearchHistoryProvider,
            protected eventsProvider: CoreEventsProvider,
            protected sitesProvider: CoreSitesProvider,
            protected domUtils: CoreDomUtilsProvider,
    ) {
        this.onSubmit = new EventEmitter<string>();
        this.onClear = new EventEmitter<void>();
    }

    ngOnInit(): void {
        this.searchLabel = this.searchLabel || this.translate.instant('core.search');
        this.placeholder = this.placeholder || this.translate.instant('core.search');
        this.spellcheck = this.utils.isTrueOrOne(this.spellcheck);
        this.showClear = this.utils.isTrueOrOne(this.showClear);
        this.searchText = this.initialSearch || '';

        if (this.searchArea) {
            this.loadHistory();
        }

        this.formElement.nativeElement.addEventListener('focus', () => {
            this.historyShown = true;
        }, true);

        this.formElement.nativeElement.addEventListener('blur', () => {
            // Wait the new element to be focused.
            setTimeout(() => {
                if (document.activeElement.closest('form') != this.formElement.nativeElement) {
                    this.historyShown = false;
                }
            });
        }, true);
    }

    /**
     * Form submitted.
     *
     * @param e Event.
     */
    submitForm(e?: Event): void {
        e && e.preventDefault();
        e && e.stopPropagation();

        if (this.searchText.length < this.lengthCheck) {
            // The view should handle this case, but we check it here too just in case.
            return;
        }

        if (this.searchArea) {
            this.saveSearchToHistory(this.searchText);
        }

        this.domUtils.triggerFormSubmittedEvent(this.formElement, false, this.sitesProvider.getCurrentSiteId());

        this.historyShown = false;
        this.searched = this.searchText;
        this.onSubmit.emit(this.searchText);
    }

    /**
     * Saves the search term onto the history.
     *
     * @param text Text to save.
     * @return Promise resolved when done.
     */
    protected async saveSearchToHistory(text: string): Promise<void> {
        try {
            await this.searchHistoryProvider.insertOrUpdateSearchText(this.searchArea, text.toLowerCase());
        } finally {
            this.loadHistory();
        }
    }

    /**
     * Loads search history.
     *
     * @return Promise resolved when done.
     */
    protected async loadHistory(): Promise<void> {
        this.history = await this.searchHistoryProvider.getSearchHistory(this.searchArea);
    }

    /**
     * Select an item and use it for search text.
     *
     * @param e Event.
     * @param text Selected text.
     */
    historyClicked(e: Event, text: string): void {
        if (this.searched != text) {
            this.searchText = text;
            this.submitForm(e);
        }
    }

    /**
     * Form submitted.
     */
    clearForm(): void {
        this.searched = '';
        this.searchText = '';
        this.onClear.emit();
    }
}
