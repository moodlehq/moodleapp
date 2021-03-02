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

import { CoreUtils } from '@services/utils/utils';

/**
 * Class to improve the behaviour of HTMLIonLoadingElement.
 * It's not a subclass of HTMLIonLoadingElement because we cannot override the dismiss function.
 */
export class CoreIonLoadingElement {

    protected isPresented = false;
    protected isDismissed = false;

    constructor(public loading: HTMLIonLoadingElement) { }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async dismiss(data?: any, role?: string): Promise<boolean> {
        if (!this.isPresented || this.isDismissed) {
            this.isDismissed = true;

            return true;
        }

        this.isDismissed = true;

        return this.loading.dismiss(data, role);
    }

    /**
     * Present the loading.
     */
    async present(): Promise<void> {
        // Wait a bit before presenting the modal, to prevent it being displayed if dismiss is called fast.
        await CoreUtils.wait(40);

        if (!this.isDismissed) {
            this.isPresented = true;

            await this.loading.present();
        }
    }

}
