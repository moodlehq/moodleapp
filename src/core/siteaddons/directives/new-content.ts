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

import { Directive, Input, OnInit, ElementRef, Optional } from '@angular/core';
import { NavController } from 'ionic-angular';
import { CoreUtilsProvider } from '../../../providers/utils/utils';
import { CoreSiteAddonsAddonContentComponent } from '../components/addon-content/addon-content';

/**
 * Directive to display a new site addon content when clicked. This new content can be displayed in a new page or in the
 * current page (only if the current page is already displaying a site addon content).
 */
@Directive({
    selector: '[core-site-addons-new-content]'
})
export class CoreSiteAddonsNewContentDirective implements OnInit {
    @Input() component: string; // The component of the new content.
    @Input() method: string; // The method to get the new content.
    @Input() args: any; // The params to get the new content.
    @Input() title: string; // The title to display with the new content. Only if samePage=false.
    @Input() samePage?: boolean | string; // Whether to display the content in same page or open a new one. Defaults to new page.

    protected element: HTMLElement;

    constructor(element: ElementRef, protected utils: CoreUtilsProvider, protected navCtrl: NavController,
            @Optional() protected parentContent: CoreSiteAddonsAddonContentComponent) {
        this.element = element.nativeElement || element;
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.element.addEventListener('click', (ev: Event): void => {
            ev.preventDefault();
            ev.stopPropagation();

            if (this.utils.isTrueOrOne(this.samePage)) {
                // Update the parent content (if it exists).
                if (this.parentContent) {
                    this.parentContent.updateContent(this.component, this.method, this.args);
                }
            } else {
                this.navCtrl.push('CoreSiteAddonsAddonPage', {
                    title: this.title,
                    component: this.component,
                    method: this.method,
                    args: this.args
                });
            }
        });
    }
}
