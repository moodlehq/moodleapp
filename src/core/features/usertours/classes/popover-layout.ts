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

import { CoreStyles, renderInlineStyles } from '@/core/utils/style-helpers';
import { CorePlatform } from '@services/platform';
import { CoreUserToursAlignment, CoreUserToursSide } from '../services/user-tours';

const ARROW_HEIGHT = 22;
const ARROW_WIDTH = 35;
const BORDER_RADIUS = 8;
const MARGIN = 16;

/**
 * Helper class to calculate layout styles for the popover wrapper in a User Tour.
 */
export class CoreUserToursPopoverLayout {

    wrapperStyles: CoreStyles;
    wrapperInlineStyles!: string;
    wrapperArrowStyles: CoreStyles;
    wrapperArrowInlineStyles!: string;

    private targetBoundingBox: DOMRect;
    private side: CoreUserToursSide;
    private alignment: CoreUserToursAlignment;

    constructor(target: HTMLElement, side: CoreUserToursSide, alignment: CoreUserToursAlignment) {
        this.targetBoundingBox = target.getBoundingClientRect();
        this.side = side;
        this.alignment = alignment;
        this.wrapperArrowStyles = {};
        this.wrapperStyles = {};

        this.calculateStyles();
    }

    /**
     * Calculate styles.
     */
    private calculateStyles(): void {
        const sideHandlers: Record<CoreUserToursSide, () => void> = {
            [CoreUserToursSide.Top]: this.calculateWrapperTopSideStyles,
            [CoreUserToursSide.Bottom]: this.calculateWrapperBottomSideStyles,
            [CoreUserToursSide.Right]: this.calculateWrapperRightSideStyles,
            [CoreUserToursSide.Left]: this.calculateWrapperLeftSideStyles,
            [CoreUserToursSide.Start]: CorePlatform.isRTL
                ? this.calculateWrapperRightSideStyles
                : this.calculateWrapperLeftSideStyles,
            [CoreUserToursSide.End]: CorePlatform.isRTL
                ? this.calculateWrapperLeftSideStyles
                : this.calculateWrapperRightSideStyles,
        };

        sideHandlers[this.side].call(this);

        this.wrapperInlineStyles = renderInlineStyles(this.wrapperStyles);
        this.wrapperArrowInlineStyles = renderInlineStyles(this.wrapperArrowStyles);
    }

    /**
     * Calculate wrapper styles for an horizontal alignment.
     */
    private calculateWrapperHorizontalAlignmentStyles(): void {
        const horizontalAlignmentHandlers: Record<CoreUserToursAlignment, () => void> ={
            [CoreUserToursAlignment.Start]: CorePlatform.isRTL
                ? this.calculateWrapperRightAlignmentStyles
                : this.calculateWrapperLeftAlignmentStyles,
            [CoreUserToursAlignment.Center]: this.calculateWrapperCenterHorizontalAlignmentStyles,
            [CoreUserToursAlignment.End]: CorePlatform.isRTL
                ? this.calculateWrapperLeftAlignmentStyles
                : this.calculateWrapperRightAlignmentStyles,
        };

        horizontalAlignmentHandlers[this.alignment].call(this);
    }

    /**
     * Calculate wrapper styles for a vertical alignment.
     */
    private calculateWrapperVerticalAlignmentStyles(): void {
        const verticalAlignmentHandlers: Record<CoreUserToursAlignment, () => void> ={
            [CoreUserToursAlignment.Start]: this.calculateWrapperTopAlignmentStyles,
            [CoreUserToursAlignment.Center]: this.calculateWrapperCenterVerticalAlignmentStyles,
            [CoreUserToursAlignment.End]: this.calculateWrapperBottomAlignmentStyles,
        };

        verticalAlignmentHandlers[this.alignment].call(this);
    }

    /**
     * Calculate wrapper arrow styles for an horizontal orientation.
     */
    private calculateWrapperArrowHorizontalStyles(): void {
        this.wrapperArrowStyles['border-width'] = `${ARROW_WIDTH / 2}px ${ARROW_HEIGHT}px`;
    }

    /**
     * Calculate wrapper arrow styles for a vertical orientation.
     */
    private calculateWrapperArrowVerticalStyles(): void {
        this.wrapperArrowStyles['border-width'] = `${ARROW_HEIGHT}px ${ARROW_WIDTH / 2}px`;
    }

    /**
     * Calculate wrapper styles for a top side placement.
     */
    private calculateWrapperTopSideStyles(): void {
        this.wrapperStyles.bottom = window.innerHeight - this.targetBoundingBox.y + ARROW_HEIGHT + MARGIN;
        this.wrapperArrowStyles.bottom = -ARROW_HEIGHT*2;
        this.wrapperArrowStyles['border-top-color'] = 'var(--popover-background)';

        this.calculateWrapperArrowVerticalStyles();
        this.calculateWrapperHorizontalAlignmentStyles();
    }

    /**
     * Calculate wrapper styles for a bottom side placement.
     */
    private calculateWrapperBottomSideStyles(): void {
        this.wrapperStyles.top = this.targetBoundingBox.y + this.targetBoundingBox.height + ARROW_HEIGHT + MARGIN;
        this.wrapperArrowStyles.top = -ARROW_HEIGHT*2;
        this.wrapperArrowStyles['border-bottom-color'] = 'var(--popover-background)';

        this.calculateWrapperArrowVerticalStyles();
        this.calculateWrapperHorizontalAlignmentStyles();
    }

    /**
     * Calculate wrapper styles for a right side placement.
     */
    private calculateWrapperRightSideStyles(): void {
        this.wrapperStyles.left = this.targetBoundingBox.x + this.targetBoundingBox.width + ARROW_HEIGHT + MARGIN;
        this.wrapperArrowStyles.left = -ARROW_HEIGHT*2;
        this.wrapperArrowStyles['border-right-color'] = 'var(--popover-background)';

        this.calculateWrapperArrowHorizontalStyles();
        this.calculateWrapperVerticalAlignmentStyles();
    }

    /**
     * Calculate wrapper styles for a left side placement.
     */
    private calculateWrapperLeftSideStyles(): void {
        this.wrapperStyles.right = window.innerWidth - this.targetBoundingBox.x + ARROW_HEIGHT + MARGIN;
        this.wrapperArrowStyles.right = -ARROW_HEIGHT*2;
        this.wrapperArrowStyles['border-left-color'] = 'var(--popover-background)';

        this.calculateWrapperArrowHorizontalStyles();
        this.calculateWrapperVerticalAlignmentStyles();
    }

    /**
     * Calculate wrapper styles for top alignment.
     */
    private calculateWrapperTopAlignmentStyles() {
        this.wrapperStyles.top = this.targetBoundingBox.y;
        this.wrapperArrowStyles.top = BORDER_RADIUS;
    }

    /**
     * Calculate wrapper styles for bottom alignment.
     */
    private calculateWrapperBottomAlignmentStyles(): void {
        this.wrapperStyles.bottom = window.innerHeight - this.targetBoundingBox.y - this.targetBoundingBox.height;
        this.wrapperArrowStyles.bottom = BORDER_RADIUS;
    }

    /**
     * Calculate wrapper styles for right alignment.
     */
    private calculateWrapperRightAlignmentStyles() {
        this.wrapperStyles.right = window.innerWidth - this.targetBoundingBox.x - this.targetBoundingBox.width;
        this.wrapperArrowStyles.right = BORDER_RADIUS;
    }

    /**
     * Calculate wrapper styles for left alignment.
     */
    private calculateWrapperLeftAlignmentStyles() {
        this.wrapperStyles.left = this.targetBoundingBox.x;
        this.wrapperArrowStyles.left = BORDER_RADIUS;
    }

    /**
     * Calculate wrapper styles for center horizontal alignment.
     */
    private calculateWrapperCenterHorizontalAlignmentStyles() {
        this.wrapperStyles.left = this.targetBoundingBox.x + this.targetBoundingBox.width / 2;
        this.wrapperStyles.transform = 'translateX(-50%)';
        this.wrapperStyles['transform-origin'] = '0 50%';
        this.wrapperArrowStyles.left = '50%';
        this.wrapperArrowStyles.transform = 'translateX(-50%)';
    }

    /**
     * Calculate wrapper styles for center vertical alignment.
     */
    private calculateWrapperCenterVerticalAlignmentStyles() {
        this.wrapperStyles.top = this.targetBoundingBox.y + this.targetBoundingBox.height / 2;
        this.wrapperStyles.transform = 'translateY(-50%)';
        this.wrapperStyles['transform-origin'] = '50% 0';
        this.wrapperArrowStyles.top = '50%';
        this.wrapperArrowStyles.transform = 'translateY(-50%)';
    }

}
