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

import { CoreDomUtils } from '@services/utils/dom';
import { CoreTextUtils } from '@services/utils/text';
import { CoreUtils } from '@services/utils/utils';
import { CoreLogger } from '@singletons/logger';
import { AddonModQuizDdwtosQuestionData } from '../component/ddwtos';

/**
 * Class to make a question of ddwtos type work.
 */
export class AddonQtypeDdwtosQuestion {

    protected logger: CoreLogger;
    protected nextDragItemNo = 1;
    protected selectors!: AddonQtypeDdwtosQuestionCSSSelectors; // Result of cssSelectors.
    protected placed: {[no: number]: number} = {}; // Map that relates drag elements numbers with drop zones numbers.
    protected selected?: HTMLElement; // Selected element (being "dragged").
    protected resizeFunction?: () => void;

    /**
     * Create the instance.
     *
     * @param logger Logger provider.
     * @param domUtils Dom Utils provider.
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
        drag.classList.add('no' + this.nextDragItemNo);
        this.nextDragItemNo++;
        drag.setAttribute('tabindex', '0');

        drag.style.visibility = 'visible';
        drag.style.position = 'absolute';

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
    cloneDragItems(): void {
        const dragHomes = <HTMLElement[]> Array.from(this.container.querySelectorAll(this.selectors.dragHomes()));
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
        const drags = <HTMLElement[]> Array.from(this.container.querySelectorAll(this.selectors.drags()));
        drags.forEach((drag) => {
            drag.classList.remove('selected');
        });
        this.selected = undefined;
    }

    /**
     * Function to call when the instance is no longer needed.
     */
    destroy(): void {
        if (this.resizeFunction) {
            window.removeEventListener('resize', this.resizeFunction);
        }
    }

    /**
     * Get the choice number of an element. It is extracted from the classes.
     *
     * @param node Element to check.
     * @return Choice number.
     */
    getChoice(node: HTMLElement | null): number | undefined {
        return this.getClassnameNumericSuffix(node, 'choice');
    }

    /**
     * Get the number in a certain class name of an element.
     *
     * @param node The element to check.
     * @param prefix Prefix of the class to check.
     * @return The number in the class.
     */
    getClassnameNumericSuffix(node: HTMLElement | null, prefix: string): number | undefined {
        if (node?.classList.length) {
            const patt1 = new RegExp('^' + prefix + '([0-9])+$');
            const patt2 = new RegExp('([0-9])+$');

            for (let index = 0; index < node.classList.length; index++) {
                if (patt1.test(node.classList[index])) {
                    const match = patt2.exec(node.classList[index]);

                    return Number(match?.[0]);
                }
            }
        }

        this.logger.warn('Prefix "' + prefix + '" not found in class names.');
    }

    /**
     * Get the group number of an element. It is extracted from the classes.
     *
     * @param node Element to check.
     * @return Group number.
     */
    getGroup(node: HTMLElement | null): number | undefined {
        return this.getClassnameNumericSuffix(node, 'group');
    }

    /**
     * Get the number of an element ('no'). It is extracted from the classes.
     *
     * @param node Element to check.
     * @return Number.
     */
    getNo(node: HTMLElement | null): number | undefined {
        return this.getClassnameNumericSuffix(node, 'no');
    }

    /**
     * Get the place number of an element. It is extracted from the classes.
     *
     * @param node Element to check.
     * @return Place number.
     */
    getPlace(node: HTMLElement | null): number | undefined {
        return this.getClassnameNumericSuffix(node, 'place');
    }

    /**
     * Initialize the question.
     */
    async initializer(): Promise<void> {
        this.selectors = new AddonQtypeDdwtosQuestionCSSSelectors();

        const container = <HTMLElement> this.container.querySelector(this.selectors.topNode());
        if (this.readOnly) {
            container.classList.add('readonly');
        } else {
            container.classList.add('notreadonly');
        }

        // Wait for the elements to be ready.
        await this.waitForReady();

        this.setPaddingSizesAll();
        this.cloneDragItems();
        this.initialPlaceOfDragItems();
        this.makeDropZones();

        this.positionDragItems();

        this.resizeFunction = this.windowResized.bind(this);
        window.addEventListener('resize', this.resizeFunction!);
    }

    /**
     * Initialize drag items, putting them in their initial place.
     */
    initialPlaceOfDragItems(): void {
        const drags = <HTMLElement[]> Array.from(this.container.querySelectorAll(this.selectors.drags()));

        // Add the class 'unplaced' to all elements.
        drags.forEach((drag) => {
            drag.classList.add('unplaced');
        });

        this.placed = {};
        for (const placeNo in this.inputIds) {
            const inputId = this.inputIds[placeNo];
            const inputNode = this.container.querySelector('input#' + inputId);
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
        const drops = <HTMLElement[]> Array.from(this.container.querySelectorAll(this.selectors.drops()));
        drops.forEach((drop) => {
            this.makeDropZone(drop);
        });

        // If home answer zone is clicked, return drag home.
        const home = <HTMLElement> this.container.querySelector(this.selectors.topNode() + ' .answercontainer');

        home.addEventListener('click', () => {
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
        node.style.width = width + 'px';
        node.style.height = height + 'px';
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
        const inputNode = this.container.querySelector('input#' + inputId);

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

        let position;

        const placeNo = this.placed[this.getNo(drag) ?? -1];
        if (!placeNo) {
            // Not placed, put it in home zone.
            const groupNo = this.getGroup(drag) ?? -1;
            const choiceNo = this.getChoice(drag) ?? -1;

            position = CoreDomUtils.getElementXY(
                this.container,
                this.selectors.dragHome(groupNo, choiceNo),
                'answercontainer',
            );
            drag.classList.add('unplaced');
        } else {
            // Get the drop zone position.
            position = CoreDomUtils.getElementXY(
                this.container,
                this.selectors.dropForPlace(placeNo),
                'addon-qtype-ddwtos-container',
            );
            drag.classList.remove('unplaced');
        }

        if (position) {
            drag.style.left = position[0] + 'px';
            drag.style.top = position[1] + 'px';
        }
    }

    /**
     * Postition, or reposition, all the drag items. They're placed in the right drop zone or in the home zone.
     */
    positionDragItems(): void {
        const drags = <HTMLElement[]> Array.from(this.container.querySelectorAll(this.selectors.drags()));
        drags.forEach((drag) => {
            this.positionDragItem(drag);
        });
    }

    /**
     * Wait for the drag items to have an offsetParent. For some reason it takes a while.
     *
     * @param retries Number of times this has been retried.
     * @return Promise resolved when ready or if it took too long to load.
     */
    protected async waitForReady(retries: number = 0): Promise<void> {
        const drag = <HTMLElement | null> Array.from(this.container.querySelectorAll(this.selectors.drags()))[0];
        if (drag?.offsetParent || retries >= 10) {
            // Ready or too many retries, stop.
            return;
        }

        const deferred = CoreUtils.promiseDefer<void>();

        setTimeout(async () => {
            try {
                await this.waitForReady(retries + 1);
            } finally {
                deferred.resolve();
            }
        }, 20);

        return deferred.promise;
    }

    /**
     * Remove a draggable element from a drop zone.
     *
     * @param drag The draggable element.
     */
    removeDragFromDrop(drag: HTMLElement): void {
        const placeNo = this.placed[this.getNo(drag) ?? -1];
        const drop = <HTMLElement> this.container.querySelector(this.selectors.dropForPlace(placeNo));

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
    setPaddingSizesAll(): void {
        for (let groupNo = 1; groupNo <= 8; groupNo++) {
            this.setPaddingSizeForGroup(groupNo);
        }
    }

    /**
     * Set the padding size for a certain group.
     *
     * @param groupNo Group number.
     */
    setPaddingSizeForGroup(groupNo: number): void {
        const groupItems = <HTMLElement[]> Array.from(this.container.querySelectorAll(this.selectors.dragHomesGroup(groupNo)));

        if (!groupItems.length) {
            return;
        }

        let maxWidth = 0;
        let maxHeight = 0;

        // Find max height and width.
        groupItems.forEach((item) => {
            item.innerHTML = CoreTextUtils.decodeHTML(item.innerHTML);
            maxWidth = Math.max(maxWidth, Math.ceil(item.offsetWidth));
            maxHeight = Math.max(maxHeight, Math.ceil(item.offsetHeight));
        });

        maxWidth += 8;
        maxHeight += 5;
        groupItems.forEach((item) => {
            this.padToWidthHeight(item, maxWidth, maxHeight);
        });

        const dropsGroup = <HTMLElement[]> Array.from(this.container.querySelectorAll(this.selectors.dropsGroup(groupNo)));
        dropsGroup.forEach((item) => {
            this.padToWidthHeight(item, maxWidth + 2, maxHeight + 2);
        });
    }

    /**
     * Window resized.
     */
    async windowResized(): Promise<void> {
        await CoreDomUtils.waitForResizeDone();

        this.positionDragItems();
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
        return this.topNode() + ' div.drags';
    }

    drags(): string {
        return this.dragContainer() + ' span.drag';
    }

    drag(no: number): string {
        return this.drags() + `.no${no}`;
    }

    dragsInGroup(groupNo: number): string {
        return this.drags() + `.group${groupNo}`;
    }

    unplacedDragsInGroup(groupNo: number): string {
        return this.dragsInGroup(groupNo) + '.unplaced';
    }

    dragsForChoiceInGroup(choiceNo: number, groupNo: number): string {
        return this.dragsInGroup(groupNo) + `.choice${choiceNo}`;
    }

    unplacedDragsForChoiceInGroup(choiceNo: number, groupNo: number): string {
        return this.unplacedDragsInGroup(groupNo) + `.choice${choiceNo}`;
    }

    drops(): string {
        return this.topNode() + ' span.drop';
    }

    dropForPlace(placeNo: number): string {
        return this.drops() + `.place${placeNo}`;
    }

    dropsInGroup(groupNo: number): string {
        return this.drops() + `.group${groupNo}`;
    }

    dragHomes(): string {
        return this.topNode() + ' span.draghome';
    }

    dragHomesGroup(groupNo: number): string {
        return this.topNode() + ` .draggrouphomes${groupNo} span.draghome`;
    }

    dragHome(groupNo: number, choiceNo: number): string {
        return this.topNode() + ` .draggrouphomes${groupNo} span.draghome.choice${choiceNo}`;
    }

    dropsGroup(groupNo: number): string {
        return this.topNode() + ` span.drop.group${groupNo}`;
    }

}
