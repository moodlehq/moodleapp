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

export abstract class CoreAriaRoleButton<T = unknown> {

    componentInstance: T;

    constructor(componentInstance: T) {
        this.componentInstance = componentInstance;
    }

    /**
     * A11y key functionality that prevents keyDown events.
     *
     * @param event Event.
     */
    keyDown(event: KeyboardEvent): void {
        if ((event.key == ' ' || event.key == 'Enter') && this.isAllowed()) {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    /**
     * A11y key functionality that translates space and enter keys to click action.
     *
     * @param event Event.
     */
    keyUp(event: KeyboardEvent): void {
        if ((event.key == ' ' || event.key == 'Enter') && this.isAllowed()) {
            event.preventDefault();
            event.stopPropagation();

            this.click(event);
        }
    }

    /**
     * A11y click functionality.
     *
     * @param event Event.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    click(event?: Event): void {
        // Nothing defined here.
    }

    /**
     * Checks if action is allowed in class.
     *
     * @returns If allowed.
     */
    isAllowed(): boolean {
        return true;
    }

}
