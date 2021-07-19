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

export class CoreAriaRoleTab<T = unknown> {

    componentInstance: T;

    constructor(componentInstance: T) {
        this.componentInstance = componentInstance;
    }

    /**
     * A11y key functionality that prevents keyDown events.
     *
     * @param e Event.
     */
    keyDown(e: KeyboardEvent): void {
        if (e.key == ' ' ||
            e.key == 'Enter' ||
            e.key == 'Home' ||
            e.key == 'End' ||
            (this.isHorizontal() && (e.key == 'ArrowRight' || e.key == 'ArrowLeft')) ||
            (!this.isHorizontal() && (e.key == 'ArrowUp' ||e.key == 'ArrowDown'))
        ) {
            e.preventDefault();
            e.stopPropagation();
        }
    }

    /**
     * A11y key functionality.
     *
     * Enter or Space: When a tab has focus, activates the tab, causing its associated panel to be displayed.
     * Right Arrow: When a tab has focus: Moves focus to the next tab. If focus is on the last tab, moves focus to the first tab.
     * Left Arrow: When a tab has focus: Moves focus to the previous tab. If focus is on the first tab, moves focus to the last tab.
     * Home: When a tab has focus, moves focus to the first tab.
     * End: When a tab has focus, moves focus to the last tab.
     * https://www.w3.org/TR/wai-aria-practices-1.1/examples/tabs/tabs-2/tabs.html
     *
     * @param tabFindIndex Tab finable index.
     * @param e Event.
     * @return Promise resolved when done.
     */
    keyUp(tabFindIndex: string, e: KeyboardEvent): void {
        if (e.key == ' ' || e.key == 'Enter') {
            this.selectTab(tabFindIndex, e);

            return;
        }

        e.preventDefault();
        e.stopPropagation();

        const tabs = this.getSelectableTabs();

        let index = tabs.findIndex((tab) => tabFindIndex == tab.findIndex);

        const previousKey = this.isHorizontal() ? 'ArrowLeft' : 'ArrowUp';
        const nextKey = this.isHorizontal() ? 'ArrowRight' : 'ArrowDown';

        switch (e.key) {
            case nextKey:
                index++;
                if (index >= tabs.length) {
                    index = 0;
                }
                break;
            case 'Home':
                index = 0;
                break;
            case previousKey:
                index--;
                if (index < 0) {
                    index = tabs.length - 1;
                }
                break;
            case 'End':
                index = tabs.length - 1;
                break;
            default:
                return;
        }

        const tabId = tabs[index].id;

        // @todo Pages should match aria-controls id.
        const tabElement = document.querySelector<HTMLIonTabButtonElement>(`ion-tab-button[aria-controls=${tabId}]`);

        tabElement?.focus();
    }

    /**
     * Selects the tab.
     *
     * @param tabId Tab identifier.
     * @param e Event.
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    selectTab(tabId: string, e: Event): void {
        //
    }

    /**
     * Return all the selectable tabs.
     *
     * @returns all the selectable tabs.
     */
    getSelectableTabs(): CoreAriaRoleTabFindable[] {
        return [];
    }

    /**
     * Returns if tabs are displayed horizontal or not.
     *
     * @returns Where the tabs are displayed horizontal.
     */
    isHorizontal(): boolean {
        return true;
    }

}

export type CoreAriaRoleTabFindable = {
    id: string;
    findIndex: string;
};
