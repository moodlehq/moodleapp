// (C) Copyright 2015 Martin Dougiamas
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
import { CoreTabsComponent } from './tabs';
import { Content } from 'ionic-angular';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreNavBarButtonsComponent } from '../navbar-buttons/navbar-buttons';

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
    template: '<ng-container *ngIf="loaded" [ngTemplateOutlet]="template"></ng-container>'
})
export class CoreTabComponent implements OnInit, OnDestroy {
    @Input() title?: string; // The tab title.
    @Input() icon?: string; // The tab icon.
    @Input() badge?: string; // A badge to add in the tab.
    @Input() badgeStyle?: string; // The badge color.
    @Input() enabled = true; // Whether the tab is enabled.
    @Input() set show(val: boolean) { // Whether the tab should be shown. Use a setter to detect changes on the value.
        if (typeof val != 'undefined') {
            const hasChanged = this._show != val;
            this._show = val;

            if (this.initialized && hasChanged) {
                this.tabs.tabVisibilityChanged();
                this.updateAriaHidden();
            }
        }
    }
    get show(): boolean { // Getter to be able to access "_show" just using .show.
        return this._show;
    }
    @Input() id?: string; // An ID to identify the tab.
    @Output() ionSelect: EventEmitter<CoreTabComponent> = new EventEmitter<CoreTabComponent>();

    @ContentChild(TemplateRef) template: TemplateRef<any>; // Template defined by the content.
    @ContentChild(Content) content: Content;

    element: HTMLElement; // The core-tab element.
    loaded = false;
    initialized = false;
    _show = true;
    tabElement: any;

    constructor(protected tabs: CoreTabsComponent, element: ElementRef, protected domUtils: CoreDomUtilsProvider,
            utils: CoreUtilsProvider) {
        this.element = element.nativeElement;

        this.element.setAttribute('role', 'tabpanel');
        this.element.setAttribute('tabindex', '0');
        this.id = this.id || 'core-tab-' + utils.getUniqueId('CoreTabComponent');
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.element.setAttribute('aria-labelledby', this.id + '-tab');
        this.element.setAttribute('id', this.id);

        this.tabs.addTab(this);
        this.initialized = true;

        setTimeout(() => {
            this.updateAriaHidden();
        }, 1000);
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
    selectTab(): void {
        this.element.classList.add('selected');

        this.tabElement = this.tabElement || document.getElementById(this.id + '-tab');

        this.updateAriaHidden();
        this.tabElement && this.tabElement.setAttribute('aria-selected', true);

        this.loaded = true;
        this.ionSelect.emit(this);
        this.showHideNavBarButtons(true);

        // Setup tab scrolling.
        setTimeout(() => {
            // Workaround to solve undefined this.scroll on tab change.
            const scroll: HTMLElement = this.content ? this.content.getScrollElement() :
                this.element.querySelector('ion-content > .scroll-content');

            if (scroll) {
                scroll.onscroll = (e): void => {
                    this.tabs.showHideTabs(e.target);
                };
                this.tabs.showHideTabs(scroll);
            }
        }, 1);
    }

    /**
     * Unselect tab.
     */
    unselectTab(): void {
        this.updateAriaHidden();
        this.tabElement && this.tabElement.setAttribute('aria-selected', false);

        this.element.classList.remove('selected');
        this.showHideNavBarButtons(false);
    }

    /**
     * Get all child core-navbar-buttons. We need to use querySelectorAll because ContentChildren doesn't work with ng-template.
     * https://github.com/angular/angular/issues/14842
     *
     * @return {CoreNavBarButtonsComponent[]} List of component instances.
     */
    protected getChildrenNavBarButtons(): CoreNavBarButtonsComponent[] {
        const elements = this.element.querySelectorAll('core-navbar-buttons'),
            instances: CoreNavBarButtonsComponent[] = [];

        for (let i = 0; i < elements.length; i++) {
            const instance = this.domUtils.getInstanceByElement(elements[i]);
            if (instance) {
                instances.push(instance);
            }
        }

        return instances;
    }

    /**
     * Show all hide all children navbar buttons.
     *
     * @param {boolean} show Whether to show or hide the buttons.
     */
    protected showHideNavBarButtons(show: boolean): void {
        const instances = this.getChildrenNavBarButtons();

        for (const i in instances) {
            instances[i].forceHide(!show);
        }
    }

    /**
     * Update aria hidden attribute.
     */
    updateAriaHidden(): void {
        if (!this.tabElement) {
            this.tabElement = document.getElementById(this.id + '-tab');
        }

        if (this.tabElement) {
            this.tabElement && this.tabElement.setAttribute('aria-hidden', !this._show);
        }
    }
}
