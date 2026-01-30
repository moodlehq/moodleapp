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

import { CoreFormatTextDirective } from '@directives/format-text';
import { CoreDirectivesRegistry } from '@static/directives-registry';
import { CoreCoordinates, CoreDom } from '@static/dom';
import { CoreEventObserver } from '@static/events';
import { CoreLogger } from '@static/logger';
import { AddonModQuizDdwtosQuestionData } from '../component/ddwtos';
import { CoreWait } from '@static/wait';
import { CoreLinkDirective } from '@directives/link';
import { ElementRef } from '@angular/core';

/**
 * Class to make a question of ddwtos type work.
 */
export class AddonQtypeDdwtosQuestion {

    protected logger: CoreLogger;
    protected nextDragItemNo = 1;
    protected selectors = new AddonQtypeDdwtosQuestionCSSSelectors(); // Result of cssSelectors.
    protected placed: { [no: number]: number } = {}; // Map that relates drag elements numbers with drop zones numbers.
    protected selected?: HTMLElement; // Selected element (being "dragged").
    protected resizeListener?: CoreEventObserver;

    /**
     * Create the instance.
     *
     * @param container The container HTMLElement of the question.
     * @param question The question instance.
     * @param readOnly Whether it's read only.
     * @param inputIds Ids of the inputs of the question (where the answers will be stored).
     */
    constructor(
        protected container: HTMLElement,
        protected question: AddonModQuizDdwtosQuestionData,
        protected readOnly: boolean,
        protected inputIds: string[],
    ) {
        this.logger = CoreLogger.getInstance('AddonQtypeDdwtosQuestion');

        this.initializer();
    }

    /**
     * Clone a drag item and add it to the drag container.
     *
     * @param dragHome Item to clone
     */
    cloneDragItem(dragHome: HTMLElement): void {
        const drag = <HTMLElement> dragHome.cloneNode(true);

        drag.classList.remove('draghome');
        drag.classList.add('drag');
        drag.classList.add(`no${this.nextDragItemNo}`);
        this.nextDragItemNo++;
        drag.setAttribute('tabindex', '0');

        drag.style.visibility = 'visible';
        drag.style.position = 'absolute';

        Array.from(drag.querySelectorAll('a')).forEach((anchor) => {
            // Cloning the item doesn't clone its directives. Add core-link to the anchors.
            const linkDir = new CoreLinkDirective(new ElementRef(anchor));
            linkDir.capture = true;
            linkDir.ngOnInit();
        });

        const container = this.container.querySelector(this.selectors.dragContainer());
        container?.appendChild(drag);

        if (!this.readOnly) {
            this.makeDraggable(drag);
        }
    }

    /**
     * Clone the 'drag homes'.
     * Invisible 'drag homes' are output in the question. These have the same properties as the drag items but are invisible.
     * We clone these invisible elements to make the actual drag items.
     */
    async cloneDragItems(): Promise<void> {
        const dragHomes = Array.from(this.container.querySelectorAll<HTMLElement>(this.selectors.dragHomes()));
        for (let x = 0; x < dragHomes.length; x++) {
            this.cloneDragItemsForOneChoice(dragHomes[x]);
        }
    }

    /**
     * Clone a certain 'drag home'. If it's an "infinite" drag, clone it several times.
     *
     * @param dragHome Element to clone.
     */
    cloneDragItemsForOneChoice(dragHome: HTMLElement): void {
        if (dragHome.classList.contains('infinite')) {
            const groupNo = this.getGroup(dragHome) ?? -1;
            const noOfDrags = this.container.querySelectorAll(this.selectors.dropsInGroup(groupNo)).length;

            for (let x = 0; x < noOfDrags; x++) {
                this.cloneDragItem(dragHome);
            }
        } else {
            this.cloneDragItem(dragHome);
        }
    }

    /**
     * Deselect all drags.
     */
    deselectDrags(): void {
        // Remove the selected class from all drags.
        const drags = Array.from(this.container.querySelectorAll<HTMLElement>(this.selectors.drags()));
        drags.forEach((drag) => {
            drag.classList.remove('selected');
        });
        this.selected = undefined;
    }

    /**
     * Function to call when the instance is no longer needed.
     */
    destroy(): void {
        this.resizeListener?.off();
    }

    /**
     * Get the choice number of an element. It is extracted from the classes.
     *
     * @param node Element to check.
     * @returns Choice number.
     */
    getChoice(node: HTMLElement | null): number | undefined {
        return this.getClassnameNumericSuffix(node, 'choice');
    }

    /**
     * Get the number in a certain class name of an element.
     *
     * @param node The element to check.
     * @param prefix Prefix of the class to check.
     * @returns The number in the class.
     */
    getClassnameNumericSuffix(node: HTMLElement | null, prefix: string): number | undefined {
        if (node?.classList.length) {
            const patt1 = new RegExp(`^${prefix}([0-9])+$`);
            const patt2 = new RegExp('([0-9])+$');

            for (let index = 0; index < node.classList.length; index++) {
                if (patt1.test(node.classList[index])) {
                    const match = patt2.exec(node.classList[index]);

                    return Number(match?.[0]);
                }
            }
        }

        this.logger.warn(`Prefix "${prefix}" not found in class names.`);
    }

    /**
     * Get the group number of an element. It is extracted from the classes.
     *
     * @param node Element to check.
     * @returns Group number.
     */
    getGroup(node: HTMLElement | null): number | undefined {
        return this.getClassnameNumericSuffix(node, 'group');
    }

    /**
     * Get the number of an element ('no'). It is extracted from the classes.
     *
     * @param node Element to check.
     * @returns Number.
     */
    getNo(node: HTMLElement | null): number | undefined {
        return this.getClassnameNumericSuffix(node, 'no');
    }

    /**
     * Get the place number of an element. It is extracted from the classes.
     *
     * @param node Element to check.
     * @returns Place number.
     */
    getPlace(node: HTMLElement | null): number | undefined {
        return this.getClassnameNumericSuffix(node, 'place');
    }

    /**
     * Initialize the question.
     */
    async initializer(): Promise<void> {
        const container = this.container.querySelector<HTMLElement>(this.selectors.topNode());
        container?.classList.add(this.readOnly ? 'readonly' : 'notreadonly');

        // Wait for the elements to be ready.
        await this.waitForReady();

        await this.setPaddingSizesAll();
        this.cloneDragItems();
        this.initialPlaceOfDragItems();
        this.makeDropZones();

        this.positionDragItems();

        this.resizeListener = CoreDom.onWindowResize(() => {
            this.positionDragItems();
        });
    }

    /**
     * Initialize drag items, putting them in their initial place.
     */
    initialPlaceOfDragItems(): void {
        const drags = Array.from(this.container.querySelectorAll<HTMLElement>(this.selectors.drags()));

        // Add the class 'unplaced' to all elements.
        drags.forEach((drag) => {
            drag.classList.add('unplaced');
        });

        this.placed = {};
        for (const placeNo in this.inputIds) {
            const inputId = this.inputIds[placeNo];
            const inputNode = this.container.querySelector(`input#${inputId}`);
            const choiceNo = Number(inputNode?.getAttribute('value'));

            if (choiceNo !== 0 && !isNaN(choiceNo)) {
                const drop = this.container.querySelector<HTMLElement>(this.selectors.dropForPlace(parseInt(placeNo, 10) + 1));
                const groupNo = this.getGroup(drop) ?? -1;
                const drag = this.container.querySelector<HTMLElement>(
                    this.selectors.unplacedDragsForChoiceInGroup(choiceNo, groupNo),
                );

                this.placeDragInDrop(drag, drop);
                this.positionDragItem(drag);
            }
        }
    }

    /**
     * Make an element "draggable". In the mobile app, items are "dragged" using tap and drop.
     *
     * @param drag Element.
     */
    makeDraggable(drag: HTMLElement): void {
        drag.addEventListener('click', () => {
            if (drag.classList.contains('selected')) {
                this.deselectDrags();
            } else {
                this.selectDrag(drag);
            }
        });
    }

    /**
     * Convert an element into a drop zone.
     *
     * @param drop Element.
     */
    makeDropZone(drop: HTMLElement): void {
        drop.addEventListener('click', () => {
            const drag = this.selected;
            if (!drag) {
                // No element selected, nothing to do.
                return false;
            }

            // Place it only if the same group is selected.
            if (this.getGroup(drag) === this.getGroup(drop)) {
                this.placeDragInDrop(drag, drop);
                this.deselectDrags();
                this.positionDragItem(drag);
            }
        });
    }

    /**
     * Create all drop zones.
     */
    makeDropZones(): void {
        if (this.readOnly) {
            return;
        }

        // Create all the drop zones.
        const drops = Array.from(this.container.querySelectorAll<HTMLElement>(this.selectors.drops()));
        drops.forEach((drop) => {
            this.makeDropZone(drop);
        });

        // If home answer zone is clicked, return drag home.
        const home = this.container.querySelector<HTMLElement>(`${this.selectors.topNode()} .answercontainer`);

        home?.addEventListener('click', () => {
            const drag = this.selected;
            if (!drag) {
                // No element selected, nothing to do.
                return;
            }

            // Not placed yet, deselect.
            if (drag.classList.contains('unplaced')) {
                this.deselectDrags();

                return;
            }

            // Remove, deselect and move back home in this order.
            this.removeDragFromDrop(drag);
            this.deselectDrags();
            this.positionDragItem(drag);
        });
    }

    /**
     * Set the width and height of an element.
     *
     * @param node Element.
     * @param width Width to set.
     * @param height Height to set.
     */
    protected padToWidthHeight(node: HTMLElement, width: number, height: number): void {
        node.style.width = `${width}px`;
        node.style.height = `${height}px`;
        // Originally lineHeight was set as height to center the text but it comes on too height lines on multiline elements.
    }

    /**
     * Place a draggable element inside a drop zone.
     *
     * @param drag Draggable element.
     * @param drop Drop zone.
     */
    placeDragInDrop(drag: HTMLElement | null, drop: HTMLElement | null): void {
        if (!drop) {
            return;
        }

        const placeNo = this.getPlace(drop) ?? -1;
        const inputId = this.inputIds[placeNo - 1];
        const inputNode = this.container.querySelector(`input#${inputId}`);

        // Set the value of the drag element in the input of the drop zone.
        if (drag !== null) {
            inputNode?.setAttribute('value', String(this.getChoice(drag)));
        } else {
            inputNode?.setAttribute('value', '0');
        }

        // Remove the element from the "placed" map if it's there.
        for (const alreadyThereDragNo in this.placed) {
            if (this.placed[alreadyThereDragNo] === placeNo) {
                delete this.placed[alreadyThereDragNo];
            }
        }

        if (drag !== null) {
            // Add the element in the "placed" map.
            this.placed[this.getNo(drag) ?? -1] = placeNo;
        }
    }

    /**
     * Position a drag element in the right drop zone or in the home zone.
     *
     * @param drag Drag element.
     */
    positionDragItem(drag: HTMLElement | null): void {
        if (!drag) {
            return;
        }

        const placeNo = this.placed[this.getNo(drag) ?? -1];
        const parent = this.container.querySelector<HTMLElement>('.addon-qtype-ddwtos-container');
        if (!parent) {
            return;
        }

        let position: CoreCoordinates | undefined;

        if (!placeNo) {
            // Not placed, put it in home zone.
            const groupNo = this.getGroup(drag) ?? -1;
            const choiceNo = this.getChoice(drag) ?? -1;
            const dragHome = this.container.querySelector<HTMLElement>(this.selectors.dragHome(groupNo, choiceNo));
            if (dragHome) {
                position = CoreDom.getRelativeElementPosition(dragHome, parent);
            }
        } else {
            // Get the drop zone position.
            const dropZone = this.container.querySelector<HTMLElement>(this.selectors.dropForPlace(placeNo));
            if (dropZone) {
                position = CoreDom.getRelativeElementPosition(dropZone, parent);
                // Avoid the border.
                position.x++;
                position.y++;
            }
        }
        drag.classList.toggle('unplaced', !placeNo);

        if (position) {
            drag.style.left = `${position.x}px`;
            drag.style.top = `${position.y}px`;
        }
    }

    /**
     * Postition, or reposition, all the drag items. They're placed in the right drop zone or in the home zone.
     */
    positionDragItems(): void {
        const drags = Array.from(this.container.querySelectorAll<HTMLElement>(this.selectors.drags()));
        drags.forEach((drag) => {
            this.positionDragItem(drag);
        });
    }

    /**
     * Wait for the drag home items to be in DOM.
     *
     * @returns Promise resolved when ready in the DOM.
     */
    protected async waitForReady(): Promise<void> {
        await CoreDom.waitToBeInDOM(this.container);

        await CoreDirectivesRegistry.waitDirectivesReady(this.container, 'core-format-text', CoreFormatTextDirective);

        const drag = Array.from(this.container.querySelectorAll<HTMLElement>(this.selectors.dragHomes()))[0];

        await CoreDom.waitToBeInDOM(drag);
    }

    /**
     * Remove a draggable element from a drop zone.
     *
     * @param drag The draggable element.
     */
    removeDragFromDrop(drag: HTMLElement): void {
        const placeNo = this.placed[this.getNo(drag) ?? -1];
        const drop = this.container.querySelector<HTMLElement>(this.selectors.dropForPlace(placeNo));

        this.placeDragInDrop(null, drop);
    }

    /**
     * Select a certain element as being "dragged".
     *
     * @param drag Element.
     */
    selectDrag(drag: HTMLElement): void {
        // Deselect previous drags, only 1 can be selected.
        this.deselectDrags();

        this.selected = drag;
        drag.classList.add('selected');
    }

    /**
     * Set the padding size for all groups.
     */
    async setPaddingSizesAll(): Promise<void> {
        for (let groupNo = 1; groupNo <= 8; groupNo++) {
            await this.setPaddingSizeForGroup(groupNo);
        }
    }

    /**
     * Set the padding size for a certain group.
     *
     * @param groupNo Group number.
     */
    async setPaddingSizeForGroup(groupNo: number): Promise<void> {
        const groupItems = Array.from(this.container.querySelectorAll<HTMLElement>(this.selectors.dragHomesGroup(groupNo)));

        if (!groupItems.length) {
            return;
        }

        // Wait to render in order to calculate size.
        if (groupItems[0].parentElement) {
            // Wait for parent to be visible. We cannot wait for group items because they have visibility hidden.
            await CoreDom.waitToBeVisible(groupItems[0].parentElement);
        } else {
            // Group items should always have a parent, add a fallback just in case.
            await CoreDom.waitToBeInDOM(groupItems[0]);
            await CoreWait.nextTicks(5);
        }

        // Find max height and width.
        let maxWidth = 0;
        let maxHeight = 0;
        groupItems.forEach((item) => {
            maxWidth = Math.max(maxWidth, Math.ceil(item.offsetWidth));
            maxHeight = Math.max(maxHeight, Math.ceil(item.offsetHeight));
        });

        maxWidth += 8;
        maxHeight += 5;
        groupItems.forEach((item) => {
            this.padToWidthHeight(item, maxWidth, maxHeight);
        });

        const dropsGroup = Array.from(this.container.querySelectorAll<HTMLElement>(this.selectors.dropsGroup(groupNo)));
        dropsGroup.forEach((item) => {
            this.padToWidthHeight(item, maxWidth + 2, maxHeight + 2);
        });
    }

}

/**
 * Set of functions to get the CSS selectors.
 */
export class AddonQtypeDdwtosQuestionCSSSelectors {

    topNode(): string {
        return '.addon-qtype-ddwtos-container';
    }

    dragContainer(): string {
        return `${this.topNode()} div.drags`;
    }

    drags(): string {
        return `${this.dragContainer()} span.drag`;
    }

    drag(no: number): string {
        return `${this.drags()}.no${no}`;
    }

    dragsInGroup(groupNo: number): string {
        return `${this.drags()}.group${groupNo}`;
    }

    unplacedDragsInGroup(groupNo: number): string {
        return `${this.dragsInGroup(groupNo)}.unplaced`;
    }

    dragsForChoiceInGroup(choiceNo: number, groupNo: number): string {
        return `${this.dragsInGroup(groupNo)}.choice${choiceNo}`;
    }

    unplacedDragsForChoiceInGroup(choiceNo: number, groupNo: number): string {
        return `${this.unplacedDragsInGroup(groupNo)}.choice${choiceNo}`;
    }

    drops(): string {
        return `${this.topNode()} span.drop`;
    }

    dropForPlace(placeNo: number): string {
        return `${this.drops()}.place${placeNo}`;
    }

    dropsInGroup(groupNo: number): string {
        return `${this.drops()}.group${groupNo}`;
    }

    dragHomes(): string {
        return `${this.topNode()} span.draghome`;
    }

    dragHomesGroup(groupNo: number): string {
        return `${this.topNode()} .draggrouphomes${groupNo} span.draghome`;
    }

    dragHome(groupNo: number, choiceNo: number): string {
        return `${this.topNode()} .draggrouphomes${groupNo} span.draghome.choice${choiceNo}`;
    }

    dropsGroup(groupNo: number): string {
        return `${this.topNode()} span.drop.group${groupNo}`;
    }

}
