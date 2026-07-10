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

import { Component, OnInit, input, linkedSignal } from '@angular/core';
import { toBoolean } from '@/core/transforms/boolean';
import { CoreNavigator } from '@services/navigator';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';
import { ModalController } from '@singletons';
import { CoreAnyError } from '@classes/errors/error';

/**
 * Page to display a URL in an iframe.
 */
@Component({
    selector: 'core-viewer-iframe',
    templateUrl: 'iframe.html',
    imports: [
        CoreSharedModule,
    ],
})
export default class CoreViewerIframePage implements OnInit {

    readonly title = input<string>();
    readonly url = input<string>();
    readonly autoLogin = input(true, { transform: toBoolean });

    readonly effectiveTitle = linkedSignal(() => this.title());
    readonly effectiveUrl = linkedSignal(() => this.url());
    readonly effectiveAutoLogin = linkedSignal(() => this.autoLogin());

    isModal = false;

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        if (!this.title() || !this.url()) {
            try {
                this.effectiveTitle.set(CoreNavigator.getRequiredRouteParam('title'));
                this.effectiveUrl.set(CoreNavigator.getRequiredRouteParam('url'));
            } catch (error) {
                CoreAlerts.showError(error as CoreAnyError);
                CoreNavigator.back();

                return;
            }

            this.effectiveAutoLogin.set(CoreNavigator.getRouteBooleanParam('autoLogin') ?? this.autoLogin());
        } else {
            this.isModal = true;
        }
    }

    /**
     * Close the modal.
     */
    closeModal(): void {
        ModalController.dismiss();
    }

}
