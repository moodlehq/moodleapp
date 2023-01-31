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

/**
 * Wrapper class to control the interactivity of an element.
 */
export abstract class ElementController {

    protected enabled: boolean;
    protected destroyed = false;

    constructor(enabled: boolean) {
        this.enabled = enabled;
    }

    /**
     * Enable element.
     */
    enable(): void {
        if (this.enabled) {
            return;
        }

        this.enabled = true;

        this.onEnabled();
    }

    /**
     * Disable element.
     */
    disable(): void {
        if (!this.enabled) {
            return;
        }

        this.enabled = false;

        this.onDisabled();
    }

    /**
     * Destroy the element.
     */
    destroy(): void {
        if (this.destroyed) {
            return;
        }

        this.destroyed = true;

        this.onDestroy();
    }

    /**
     * Update underlying element to enable interactivity.
     */
    abstract onEnabled(): void;

    /**
     * Update underlying element to disable interactivity.
     */
    abstract onDisabled(): void;

    /**
     * Destroy/dispose pertinent data.
     */
    onDestroy(): void {
        // By default, nothing to destroy.
    }

}
