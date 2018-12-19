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

import { CoreLoggerProvider } from '@providers/logger';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';

/**
 * Set of functions to get the CSS selectors.
 */
export interface AddonQtypeDdwtosQuestionCSSSelectors {
    topNode?: () => string;
    dragContainer?: () => string;
    drags?: () => string;
    drag?: (no: number) => string;
    dragsInGroup?: (groupNo: number) => string;
    unplacedDragsInGroup?: (groupNo: number) => string;
    dragsForChoiceInGroup?: (choiceNo: number, groupNo: number) => string;
    unplacedDragsForChoiceInGroup?: (choiceNo: number, groupNo: number) => string;
    drops?: () => string;
    dropForPlace?: (placeNo: number) => string;
    dropsInGroup?: (groupNo: number) => string;
    dragHomes?: () => string;
    dragHomesGroup?: (groupNo: number) => string;
    dragHome?: (groupNo: number, choiceNo: number) => string;
    dropsGroup?: (groupNo: number) => string;
}

/**
 * Class to make a question of ddwtos type work.
 */
export class AddonQtypeDdwtosQuestion {

    protected logger: any;
    protected nextDragItemNo = 1;
    protected selectors: AddonQtypeDdwtosQuestionCSSSelectors; // Result of cssSelectors.
    protected placed: {[no: number]: number}; // Map that relates drag elements numbers with drop zones numbers.
    protected selected: HTMLElement; // Selected element (being "dragged").
    protected resizeFunction;

    /**
     * Create the instance.
     *
     * @param {CoreLoggerProvider} logger Logger provider.
     * @param {CoreDomUtilsProvider} domUtils Dom Utils provider.
     * @param {HTMLElement} container The container HTMLElement of the question.
     * @param {any} question The question instance.
     * @param {boolean} readOnly Whether it's read only.
     * @param {string[]} inputIds Ids of the inputs of the question (where the answers will be stored).
     */
    constructor(logger: CoreLoggerProvider, protected domUtils: CoreDomUtilsProvider, protected container: HTMLElement,
            protected question: any, protected readOnly: boolean, protected inputIds: string[],
            protected textUtils: CoreTextUtilsProvider) {
        this.logger = logger.getInstance('AddonQtypeDdwtosQuestion');

        this.initializer(question);
    }

    /**
     * Clone a drag item and add it to the drag container.
     *
     * @param {HTMLElement} dragHome Item to clone
     */
    cloneDragItem(dragHome: HTMLElement): void {
        const drag = <HTMLElement> dragHome.cloneNode(true);

        drag.classList.remove('draghome');
        drag.classList.add('drag');
        drag.classList.add('no' + this.nextDragItemNo);
        this.nextDragItemNo++;

        drag.style.visibility = 'visible';
        drag.style.position = 'absolute';

        const container = this.container.querySelector(this.selectors.dragContainer());
        container.appendChild(drag);

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
     * @param {HTMLElement} dragHome Element to clone.
     */
    cloneDragItemsForOneChoice(dragHome: HTMLElement): void {
        if (dragHome.classList.contains('infinite')) {
            const groupNo = this.getGroup(dragHome),
                noOfDrags = this.container.querySelectorAll(this.selectors.dropsInGroup(groupNo)).length;

            for (let x = 0; x < noOfDrags; x++) {
                this.cloneDragItem(dragHome);
            }
        } else {
            this.cloneDragItem(dragHome);
        }
    }

    /**
     * Get an object with a set of functions to get the CSS selectors.
     *
     * @param {number} slot Question slot.
     * @return {AddonQtypeDdwtosQuestionCSSSelectors} Object with the functions to get the selectors.
     */
    cssSelectors(slot: number): AddonQtypeDdwtosQuestionCSSSelectors {
        const topNode = '.addon-qtype-ddwtos-container',
            selectors: AddonQtypeDdwtosQuestionCSSSelectors = {};

        selectors.topNode = (): string => {
            return topNode;
        };
        selectors.dragContainer = (): string => {
            return topNode + ' div.drags';
        };
        selectors.drags = (): string => {
            return selectors.dragContainer() + ' span.drag';
        };
        selectors.drag = (no: number): string => {
            return selectors.drags() + '.no' + no;
        };
        selectors.dragsInGroup = (groupNo: number): string => {
            return selectors.drags() + '.group' + groupNo;
        };
        selectors.unplacedDragsInGroup = (groupNo: number): string => {
            return selectors.dragsInGroup(groupNo) + '.unplaced';
        };
        selectors.dragsForChoiceInGroup = (choiceNo: number, groupNo: number): string => {
            return selectors.dragsInGroup(groupNo) + '.choice' + choiceNo;
        };
        selectors.unplacedDragsForChoiceInGroup = (choiceNo: number, groupNo: number): string => {
            return selectors.unplacedDragsInGroup(groupNo) + '.choice' + choiceNo;
        };
        selectors.drops = (): string => {
            return topNode + ' span.drop';
        };
        selectors.dropForPlace = (placeNo: number): string => {
            return selectors.drops() + '.place' + placeNo;
        };
        selectors.dropsInGroup = (groupNo: number): string => {
            return selectors.drops() + '.group' + groupNo;
        };
        selectors.dragHomes = (): string => {
            return topNode + ' span.draghome';
        };
        selectors.dragHomesGroup = (groupNo: number): string => {
            return topNode + ' .draggrouphomes' + groupNo + ' span.draghome';
        };
        selectors.dragHome = (groupNo: number, choiceNo: number): string => {
            return topNode + ' .draggrouphomes' + groupNo + ' span.draghome.choice' + choiceNo;
        };
        selectors.dropsGroup = (groupNo: number): string => {
            return topNode + ' span.drop.group' + groupNo;
        };

        return selectors;
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
        this.selected = null;
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
     * @param {HTMLElement} node Element to check.
     * @return {number} Choice number.
     */
    getChoice(node: HTMLElement): number {
        return this.getClassnameNumericSuffix(node, 'choice');
    }

    /**
     * Get the number in a certain class name of an element.
     *
     * @param {HTMLElement} node The element to check.
     * @param {string} prefix Prefix of the class to check.
     * @return {number} The number in the class.
     */
    getClassnameNumericSuffix(node: HTMLElement, prefix: string): number {
        if (node.classList && node.classList.length) {
            const patt1 = new RegExp('^' + prefix + '([0-9])+$'),
                patt2 = new RegExp('([0-9])+$');

            for (let index = 0; index < node.classList.length; index++) {
                if (patt1.test(node.classList[index])) {
                    const match = patt2.exec(node.classList[index]);

                    return Number(match[0]);
                }
            }
        }

        this.logger.warn('Prefix "' + prefix + '" not found in class names.');
    }

    /**
     * Get the group number of an element. It is extracted from the classes.
     *
     * @param {HTMLElement} node Element to check.
     * @return {number} Group number.
     */
    getGroup(node: HTMLElement): number {
        return this.getClassnameNumericSuffix(node, 'group');
    }

    /**
     * Get the number of an element ('no'). It is extracted from the classes.
     *
     * @param {HTMLElement} node Element to check.
     * @return {number} Number.
     */
    getNo(node: HTMLElement): number {
        return this.getClassnameNumericSuffix(node, 'no');
    }

    /**
     * Get the place number of an element. It is extracted from the classes.
     *
     * @param {HTMLElement} node Element to check.
     * @return {number} Place number.
     */
    getPlace(node: HTMLElement): number {
        return this.getClassnameNumericSuffix(node, 'place');
    }

    /**
     * Initialize the question.
     *
     * @param {any} question Question.
     */
    initializer(question: any): void {
        this.selectors = this.cssSelectors(question.slot);

        const container = <HTMLElement> this.container.querySelector(this.selectors.topNode());
        if (this.readOnly) {
            container.classList.add('readonly');
        } else {
            container.classList.add('notreadonly');
        }

        this.setPaddingSizesAll();
        this.cloneDragItems();
        this.initialPlaceOfDragItems();
        this.makeDropZones();

        // Wait the DOM to be rendered.
        setTimeout(() => {
            this.positionDragItems();
        });

        this.resizeFunction = this.positionDragItems.bind(this);
        window.addEventListener('resize', this.resizeFunction);
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
            const inputId = this.inputIds[placeNo],
                inputNode = this.container.querySelector('input#' + inputId),
                choiceNo = Number(inputNode.getAttribute('value'));

            if (choiceNo !== 0) {
                const drop = <HTMLElement> this.container.querySelector(this.selectors.dropForPlace(parseInt(placeNo, 10) + 1)),
                    groupNo = this.getGroup(drop),
                    drag = <HTMLElement> this.container.querySelector(
                            this.selectors.unplacedDragsForChoiceInGroup(choiceNo, groupNo));

                this.placeDragInDrop(drag, drop);
                this.positionDragItem(drag);
            }
        }
    }

    /**
     * Make an element "draggable". In the mobile app, items are "dragged" using tap and drop.
     *
     * @param {HTMLElement} drag Element.
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
     * @param {HTMLElement} drop Element.
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
     * @param {HTMLElement} node Element.
     * @param {number} width Width to set.
     * @param {number} height Height to set.
     */
    protected padToWidthHeight(node: HTMLElement, width: number, height: number): void {
        node.style.width = width + 'px';
        node.style.height = height + 'px';
        // Originally lineHeight was set as height to center the text but it comes on too height lines on multiline elements.
    }

    /**
     * Place a draggable element inside a drop zone.
     *
     * @param {HTMLElement} drag Draggable element.
     * @param {HTMLElement} drop Drop zone.
     */
    placeDragInDrop(drag: HTMLElement, drop: HTMLElement): void {

        const placeNo = this.getPlace(drop),
            inputId = this.inputIds[placeNo - 1],
            inputNode = this.container.querySelector('input#' + inputId);

        // Set the value of the drag element in the input of the drop zone.
        if (drag !== null) {
            inputNode.setAttribute('value', String(this.getChoice(drag)));
        } else {
            inputNode.setAttribute('value', '0');
        }

        // Remove the element from the "placed" map if it's there.
        for (const alreadyThereDragNo in this.placed) {
            if (this.placed[alreadyThereDragNo] === placeNo) {
                delete this.placed[alreadyThereDragNo];
            }
        }

        if (drag !== null) {
            // Add the element in the "placed" map.
            this.placed[this.getNo(drag)] = placeNo;
        }
    }

    /**
     * Position a drag element in the right drop zone or in the home zone.
     *
     * @param {HTMLElement} drag Drag element.
     */
    positionDragItem(drag: HTMLElement): void {
        let position;

        const placeNo = this.placed[this.getNo(drag)];
        if (!placeNo) {
            // Not placed, put it in home zone.
            const groupNo = this.getGroup(drag),
                choiceNo = this.getChoice(drag);

            position = this.domUtils.getElementXY(this.container, this.selectors.dragHome(groupNo, choiceNo), 'answercontainer');
            drag.classList.add('unplaced');
        } else {
            // Get the drop zone position.
            position = this.domUtils.getElementXY(this.container, this.selectors.dropForPlace(placeNo),
                    'addon-qtype-ddwtos-container');
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
     * Remove a draggable element from a drop zone.
     *
     * @param {HTMLElement} drag The draggable element.
     */
    removeDragFromDrop(drag: HTMLElement): void {
        const placeNo = this.placed[this.getNo(drag)],
            drop = <HTMLElement> this.container.querySelector(this.selectors.dropForPlace(placeNo));

        this.placeDragInDrop(null, drop);
    }

    /**
     * Select a certain element as being "dragged".
     *
     * @param {HTMLElement} drag Element.
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
     * @param {number} groupNo Group number.
     */
    setPaddingSizeForGroup(groupNo: number): void {
        const groupItems = <HTMLElement[]> Array.from(this.container.querySelectorAll(this.selectors.dragHomesGroup(groupNo)));

        if (groupItems.length !== 0) {
            let maxWidth = 0,
                maxHeight = 0;

            // Find max height and width.
            groupItems.forEach((item) => {
                item.innerHTML = this.textUtils.decodeHTML(item.innerHTML);
                maxWidth = Math.max(maxWidth, Math.ceil(item.offsetWidth));
                maxHeight = Math.max(maxHeight, Math.ceil(item.offsetHeight));
            });

            maxWidth += 8;
            maxHeight += 2;
            groupItems.forEach((item) => {
                this.padToWidthHeight(item, maxWidth, maxHeight);
            });

            const dropsGroup = <HTMLElement[]> Array.from(this.container.querySelectorAll(this.selectors.dropsGroup(groupNo)));
            dropsGroup.forEach((item) => {
                this.padToWidthHeight(item, maxWidth + 2, maxHeight + 2);
            });
        }
    }
}
