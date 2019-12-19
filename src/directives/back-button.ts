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

import { Directive, OnInit, OnDestroy } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Navbar, Platform } from 'ionic-angular';
import { CoreEventsProvider } from '@providers/events';

/**
 * Directive to tramslate the back button of navigation bars in iOS.
 *
 * @description
 * Usage:
 * <ion-navbar core-back-button> ... </ion-navbar>
 */
@Directive({
    selector: 'ion-navbar[core-back-button]'
})
export class CoreBackButtonDirective implements OnInit, OnDestroy {
    protected languageObserver: any;

    constructor(private host: Navbar, private platform: Platform,
        private translate: TranslateService, private eventsProvider: CoreEventsProvider) {}

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        this.setTranslatedBackButtonText();
        this.languageObserver = this.eventsProvider.on(CoreEventsProvider.LANGUAGE_CHANGED, () => {
            this.setTranslatedBackButtonText();
        });
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): void {
        if (this.languageObserver) {
            this.languageObserver.off();
        }
    }

    /**
     * Set the trasnlated back button text in iOS.
     */
    protected setTranslatedBackButtonText(): void {
        if (this.host && this.platform.is('ios')) {
            this.host.setBackButtonText(this.translate.instant('core.back'));
        }
    }
}
