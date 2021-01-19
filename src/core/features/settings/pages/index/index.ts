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

import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';

import { CoreNavigator } from '@services/navigator';
import { CoreScreen } from '@services/screen';
import { CoreSettingsConstants, CoreSettingsSection } from '@features/settings/constants';

@Component({
    selector: 'page-core-settings-index',
    templateUrl: 'index.html',
})
export class CoreSettingsIndexPage implements OnInit, OnDestroy {

    sections = CoreSettingsConstants.SECTIONS;
    activeSection?: string;
    layoutSubscription?: Subscription;

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.layoutSubscription = CoreScreen.instance.layoutObservable.subscribe(() => this.updateActiveSection());
    }

    /**
     * @inheritdoc
     */
    ionViewWillEnter(): void {
        this.updateActiveSection();
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.layoutSubscription?.unsubscribe();
    }

    /**
     * Open a section page.
     *
     * @param section Section to open.
     */
    openSection(section: CoreSettingsSection): void {
        const path = this.activeSection ? `../${section.path}` : section.path;

        CoreNavigator.instance.navigate(path);

        this.updateActiveSection(section.name);
    }

    /**
     * Update active section.
     *
     * @param activeSection Active section.
     */
    private updateActiveSection(activeSection?: string): void {
        if (CoreScreen.instance.isMobile) {
            delete this.activeSection;

            return;
        }

        this.activeSection = activeSection ?? this.guessActiveSection();
    }

    /**
     * Guess active section looking at the current route.
     *
     * @return Active section.
     */
    private guessActiveSection(): string | undefined {
        const activeSection = this.sections.find(
            section => CoreNavigator.instance.isCurrent(`**/settings/${section.path}`),
        );

        return activeSection?.name;
    }

}
