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

import { Params } from '@angular/router';
import { CoreRoutedItemsManagerSource } from '@classes/items-management/routed-items-manager-source';

import { CoreUser, CoreUserDescriptionExporter, CoreUserParticipant } from '../services/user';
import { CORE_USER_PARTICIPANTS_LIST_LIMIT } from '../constants';

/**
 * Provides a collection of course participants.
 */
export class CoreUserParticipantsSource extends CoreRoutedItemsManagerSource<CoreUserParticipant | CoreUserDescriptionExporter> {

    /**
     * @inheritdoc
     */
    static getSourceId(courseId: number, searchQuery: string | null = null): string {
        searchQuery = searchQuery ?? '__empty__';

        return `participants-${courseId}-${searchQuery}`;
    }

    readonly courseId: number;
    readonly searchQuery: string | null;

    constructor(courseId: number, searchQuery: string | null = null) {
        super();

        this.courseId = courseId;
        this.searchQuery = searchQuery;
    }

    /**
     * @inheritdoc
     */
    getItemPath(user: CoreUserParticipant | CoreUserDescriptionExporter): string {
        return user.id.toString();
    }

    /**
     * @inheritdoc
     */
    getItemQueryParams(): Params {
        return { search: this.searchQuery };
    }

    /**
     * @inheritdoc
     */
    protected async loadPageItems(
        page: number,
    ): Promise<{ items: (CoreUserParticipant | CoreUserDescriptionExporter)[]; hasMoreItems: boolean }> {
        if (this.searchQuery) {
            const { participants, canLoadMore } = await CoreUser.searchParticipants(
                this.courseId,
                this.searchQuery,
                true,
                page,
                CORE_USER_PARTICIPANTS_LIST_LIMIT,
            );

            return {
                items: participants,
                hasMoreItems: canLoadMore,
            };
        }

        const { participants, canLoadMore } = await CoreUser.getParticipants(
            this.courseId,
            page * CORE_USER_PARTICIPANTS_LIST_LIMIT,
            CORE_USER_PARTICIPANTS_LIST_LIMIT,
        );

        return {
            items: participants,
            hasMoreItems: canLoadMore,
        };
    }

    /**
     * @inheritdoc
     */
    protected getPageLength(): number {
        return CORE_USER_PARTICIPANTS_LIST_LIMIT;
    }

}
