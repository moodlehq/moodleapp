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

import {
    Component,
    Output,
    EventEmitter,
    OnInit,
    signal,
    ElementRef,
    input,
    viewChild,
    model,
    effect,
    computed,
} from '@angular/core';

import { CoreSites } from '@services/sites';
import { CoreSearchHistory } from '../../services/search-history.service';
import { Translate } from '@singletons';
import { CoreSearchHistoryDBRecord } from '../../services/search-history-db';
import { CoreForms } from '@singletons/form';
import { toBoolean } from '@/core/transforms/boolean';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Component to display a "search box".
 *
 * @description
 * This component will display a standalone search box with its search button in order to have a better UX.
 *
 * Example usage:
 * <core-search-box (searchTextChange)="search($event)" [placeholder]="'core.courses.search' | translate"
 *     [searchLabel]="'core.courses.search' | translate" [autoFocus]="true" />
 */
@Component({
    selector: 'core-search-box',
    templateUrl: 'core-search-box.html',
    styleUrl: 'search-box.scss',
    imports: [
        CoreSharedModule,
    ],
})
export class CoreSearchBoxComponent implements OnInit {

    readonly searchLabel = input(Translate.instant('core.search')); // Label to be used on action button.
    readonly placeholder = input(Translate.instant('core.search')); // Placeholder text for search text input.
    readonly autocorrect = input<'on'|'off'>('on'); // Enables/disable Autocorrection on search text input.
    readonly spellcheck = input(true, { transform: toBoolean }); // Enables/disable Spellchecker on search text input.
    readonly autoFocus = input(false, { transform: toBoolean }); // Enables/disable Autofocus when entering view.
    readonly lengthCheck = input(3); // Check value length before submit. If 0, any string will be submitted.
    readonly showClear = input(true, { transform: toBoolean }); // Show/hide clear button.
    readonly disabled = input(false, { transform: toBoolean }); // Disables the input text.
    /**
     * @deprecated since 5.1. Use [searchText] instead.
     * Beware changing searchText will change the value of the initialSearch while initialSearch changes didn't affect the value.
     */
    readonly initialSearch = input(''); // Initial search text.

    /**
     * Search text. The change event will be emitted only when the submit or the clear button are pressed.
     */
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    readonly searchText = model(this.initialSearch());
    /**
     * If provided. It will save and display a history of searches for this particular Id.
     * To use different history lists, place different Id.
     * I.e. AddonMessagesContacts or CoreUserParticipants-6 (using the course Id).
     */
    readonly searchArea = input('');

    /**
     * @deprecated since 5.1. Use (searchTextChange) instead.
     */
    @Output() onSubmit = new EventEmitter<string>(); // Send data when submitting the search form.
    /**
     * @deprecated since 5.1. Use (searchTextChange) instead.
     */
    @Output() onClear = new EventEmitter<void>(); // Send event when clearing the search form.

    readonly formElement = viewChild<ElementRef<HTMLFormElement>>('searchForm');
    /**
     * Value of the input field. The value will be emitted when the form is submitted.
     */
    readonly inputValue = signal('');
    readonly history = signal<CoreSearchHistoryDBRecord[]>([]);
    readonly historyShown = signal(false);
    readonly showLengthAlert = signal(false);
    readonly dirty = computed(() =>
        // If the text input is dirty, it means that the user has changed the text input.
        this.inputValue() !== this.searchText());

    constructor() {
        // Change the text input value when the searchText from outside of the component changes.
        effect(() => {
            const newText = this.searchText();
            this.inputValue.set(newText);
        });
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        if (this.searchArea()) {
            this.loadHistory();
        }

        // Perform an initial search.
        if (this.searchText()) {
            this.inputValue.set(this.searchText());
            this.submitForm();
        }
    }

    /**
     * Form submitted.
     *
     * @param e Event.
     */
    submitForm(e?: Event): void {
        e?.preventDefault();
        e?.stopPropagation();

        const textInput = this.inputValue();
        if (textInput.length === 0) {
            // Empty search, treat as a clear.
            this.clearForm();

            return;
        }

        if (textInput.length < this.lengthCheck()) {
            this.showLengthAlert.set(true);

            return;
        }

        this.showLengthAlert.set(false);

        if (this.searchArea()) {
            this.saveSearchToHistory(textInput);
        }

        CoreForms.triggerFormSubmittedEvent(this.formElement(), false, CoreSites.getCurrentSiteId());

        this.historyShown.set(false);
        this.searchText.set(textInput);

        // eslint-disable-next-line @typescript-eslint/no-deprecated
        this.onSubmit.emit(textInput);
    }

    /**
     * Saves the search term onto the history.
     *
     * @param text Text to save.
     */
    protected async saveSearchToHistory(text: string): Promise<void> {
        try {
            await CoreSearchHistory.insertOrUpdateSearchText(this.searchArea(), text.toLowerCase());
        } finally {
            this.loadHistory();
        }
    }

    /**
     * Loads search history.
     */
    protected async loadHistory(): Promise<void> {
        const history = await CoreSearchHistory.getSearchHistory(this.searchArea());

        this.history.set(history);
    }

    /**
     * Select an item and use it for search text.
     *
     * @param e Event.
     * @param text Selected text.
     */
    historyClicked(e: Event, text: string): void {
        if (this.inputValue() !== text) {
            this.inputValue.set(text);
            this.submitForm(e);
        }
    }

    /**
     * Form submitted.
     */
    clearForm(): void {
        this.inputValue.set('');
        this.searchText.set('');
        this.showLengthAlert.set(false);

        // eslint-disable-next-line @typescript-eslint/no-deprecated
        this.onClear.emit();
    }

    /**
     * Search input focused.
     */
    focus(): void {
        this.historyShown.set(true);
    }

    /**
     * Checks if the search box has lost focus.
     */
    checkFocus(): void {
        // Wait until the new element is focused.
        setTimeout(() => {
            if (document.activeElement?.closest('form') !== this.formElement()?.nativeElement) {
                this.historyShown.set(false);
                this.showLengthAlert.set(false);
            }
        });
    }

}
