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

import { Component, Input, Output, OnInit, OnDestroy, ElementRef, EventEmitter, ContentChild, TemplateRef } from '@angular/core';
import { CoreTabBase } from '@classes/tabs';

import { CoreUtils } from '@singletons/utils';
import { CoreDirectivesRegistry } from '@singletons/directives-registry';
import { CoreNavBarButtonsComponent } from '../navbar-buttons/navbar-buttons';
import { CoreTabsComponent } from './tabs';
import { CoreBaseModule } from '@/core/base.module';

/**
 * A tab to use inside core-tabs. The content of this tab will be displayed when the tab is selected.
 *
 * You must provide either a title or an icon for the tab.
 *
 * The tab content MUST be surrounded by ng-template. This component uses ngTemplateOutlet instead of ng-content because the
 * latter executes all the code immediately. This means that all the tabs would be initialized as soon as your view is
 * loaded, leading to performance issues.
 *
 * Example usage:
 *
 * <core-tabs selectedIndex="1">
 *     <core-tab [title]="'core.courses.timeline' | translate" (ionSelect)="switchTab('timeline')">
 *         <ng-template> <!-- This ng-template is required. -->
 *             <!-- Tab contents. -->
 *         </ng-template>
 *     </core-tab>
 * </core-tabs>
 */
@Component({
    selector: 'core-tab',
    template: '@if (loaded && template) {<ng-container [ngTemplateOutlet]="template" />}',
    imports: [CoreBaseModule],
})
export class CoreTabComponent implements OnInit, OnDestroy, CoreTabBase {

    @Input({ required: true }) title!: string; // The tab title.
    @Input() icon?: string; // The tab icon.
    @Input() badge?: string; // A badge to add in the tab.
    @Input() badgeStyle?: string; // The badge color.
    @Input() badgeA11yText?: string; // Accessibility text to add on the badge.
    @Input() class?: string; // Class, if needed.
    @Input() set enabled(value: boolean) { // Whether the tab should be shown.
        value = value === undefined ? true : value;
        const hasChanged = this.isEnabled != value;
        this.isEnabled = value;

        if (this.initialized && hasChanged) {
            this.tabs.tabVisibilityChanged();
        }
    }

    get enabled(): boolean {
        return this.isEnabled;
    }

    @Input() id = ''; // An ID to identify the tab.
    @Output() ionSelect: EventEmitter<CoreTabComponent> = new EventEmitter<CoreTabComponent>();

    @ContentChild(TemplateRef) template?: TemplateRef<void>; // Template defined by the content.

    element: HTMLElement; // The core-tab element.
    loaded = false;
    initialized = false;
    tabElement?: HTMLElement | null;

    protected isEnabled = true;

    constructor(
        protected tabs: CoreTabsComponent,
        element: ElementRef,
    ) {
        this.element = element.nativeElement;
        this.id = this.id || `core-tab-${CoreUtils.getUniqueId('CoreTabComponent')}`;
        this.element.setAttribute('role', 'tabpanel');
        this.element.setAttribute('tabindex', '0');
        this.element.setAttribute('aria-hidden', 'true');
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.element.setAttribute('aria-labelledby', `${this.id}-tab`);
        this.element.setAttribute('id', this.id);

        this.tabs.addTab(this);
        this.initialized = true;
    }

    /**
     * Component destroyed.
     */
    ngOnDestroy(): void {
        this.tabs.removeTab(this);
    }

    /**
     * Select tab.
     */
    async selectTab(): Promise<void> {
        this.element.classList.add('selected');

        this.tabElement = this.tabElement || document.getElementById(`${this.id}-tab`);
        this.tabElement?.setAttribute('aria-selected', 'true');
        this.element.setAttribute('aria-hidden', 'false');

        this.loaded = true;
        this.ionSelect.emit(this);
        this.showHideNavBarButtons(true);
    }

    /**
     * Unselect tab.
     */
    unselectTab(): void {
        this.tabElement?.setAttribute('aria-selected', 'false');
        this.element.classList.remove('selected');
        this.element.setAttribute('aria-hidden', 'true');

        this.showHideNavBarButtons(false);
    }

    /**
     * Show all hide all children navbar buttons.
     *
     * @param show Whether to show or hide the buttons.
     */
    protected showHideNavBarButtons(show: boolean): void {
        const elements = this.element.querySelectorAll('core-navbar-buttons');
        elements.forEach((element) => {
            const instance = CoreDirectivesRegistry.resolve(element, CoreNavBarButtonsComponent);

            if (instance) {
                instance.forceHide(!show);
            }
        });
    }

}
