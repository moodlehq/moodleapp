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

import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@singletons';
import { AddonModWikiPageDBRecord } from '../../services/database/wiki';
import { AddonModWikiSubwikiPage } from '../../services/wiki';

/**
 * Modal to display the map of a Wiki.
 */
@Component({
    selector: 'page-addon-mod-wiki-map',
    templateUrl: 'map.html',
})
export class AddonModWikiMapModalComponent implements OnInit {

    @Input() pages: (AddonModWikiSubwikiPage | AddonModWikiPageDBRecord)[] = [];
    @Input() selectedTitle?: string;
    @Input() moduleId?: number;
    @Input() courseId?: number;
    @Input() homeView?: string;

    map: AddonModWikiPagesMapLetter[] = []; // Map of pages, categorized by letter.

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        this.constructMap();
    }

    /**
     * Function called when a page is clicked.
     *
     * @param page Clicked page.
     */
    goToPage(page: AddonModWikiSubwikiPage | AddonModWikiPageDBRecord): void {
        ModalController.dismiss(<AddonModWikiMapModalReturn>{ page });
    }

    /**
     * Go back to the initial page of the wiki.
     */
    goToWikiHome(): void {
        ModalController.dismiss(<AddonModWikiMapModalReturn>{ home: this.homeView });
    }

    /**
     * Construct the map of pages.
     */
    protected constructMap(): void {
        let letter: AddonModWikiPagesMapLetter;
        let initialLetter: string;

        this.map = [];
        this.pages.sort((a, b) => {
            const compareA = a.title.toLowerCase().trim();
            const compareB = b.title.toLowerCase().trim();

            return compareA.localeCompare(compareB);
        });

        this.pages.forEach((page) => {
            const letterCandidate = page.title.charAt(0).toLocaleUpperCase();

            // Should we create a new grouping?
            if (letterCandidate !== initialLetter) {
                initialLetter = letterCandidate;
                letter = { label: letterCandidate, pages: [] };

                this.map.push(letter);
            }

            // Add the subwiki to the currently active grouping.
            letter.pages.push(page);
        });
    }

    /**
     * Close modal.
     */
    closeModal(): void {
        ModalController.dismiss();
    }

}

type AddonModWikiPagesMapLetter = {
    label: string;
    pages: (AddonModWikiSubwikiPage | AddonModWikiPageDBRecord)[];
};

export type AddonModWikiMapModalReturn = {
    page?: AddonModWikiSubwikiPage | AddonModWikiPageDBRecord;
    home?: string;
};
