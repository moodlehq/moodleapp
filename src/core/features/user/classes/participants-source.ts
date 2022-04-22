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

import { CoreUser, CoreUserData, CoreUserParticipant, CoreUserProvider } from '../services/user';

/**
 * Provides a collection of course participants.
 */
export class CoreUserParticipantsSource extends CoreRoutedItemsManagerSource<CoreUserParticipant | CoreUserData> {

    /**
     * @inheritdoc
     */
    static getSourceId(courseId: number, searchQuery: string | null = null): string {
        searchQuery = searchQuery ?? '__empty__';

        return `participants-${courseId}-${searchQuery}`;
    }

    readonly COURSE_ID: number;
    readonly SEARCH_QUERY: string | null;

    constructor(courseId: number, searchQuery: string | null = null) {
        super();

        this.COURSE_ID = courseId;
        this.SEARCH_QUERY = searchQuery;
    }

    /**
     * @inheritdoc
     */
    getItemPath(user: CoreUserParticipant | CoreUserData): string {
        return user.id.toString();
    }

    /**
     * @inheritdoc
     */
    getItemQueryParams(): Params {
        return { search: this.SEARCH_QUERY };
    }

    /**
     * @inheritdoc
     */
    protected async loadPageItems(page: number): Promise<{ items: (CoreUserParticipant | CoreUserData)[]; hasMoreItems: boolean }> {
        if (this.SEARCH_QUERY) {
            const { participants, canLoadMore } = await CoreUser.searchParticipants(
                this.COURSE_ID,
                this.SEARCH_QUERY,
                true,
                page,
                CoreUserProvider.PARTICIPANTS_LIST_LIMIT,
            );

            return {
                items: participants,
                hasMoreItems: canLoadMore,
            };
        }

        const { participants, canLoadMore } = await CoreUser.getParticipants(
            this.COURSE_ID,
            page * CoreUserProvider.PARTICIPANTS_LIST_LIMIT,
            CoreUserProvider.PARTICIPANTS_LIST_LIMIT,
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
        return CoreUserProvider.PARTICIPANTS_LIST_LIMIT;
    }

}
