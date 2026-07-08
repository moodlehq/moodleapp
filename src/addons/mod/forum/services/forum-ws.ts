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

import { Injectable } from '@angular/core';
import { CoreSites } from '@services/sites';
import { CoreStatusWithWarningsWSResponse } from '@services/ws';
import { makeSingleton } from '@singletons';
import { CoreObject } from '@static/object';
import { CoreTextFormat } from '@static/text';

/**
 * Service to interact with the forum Web Services.
 */
@Injectable({ providedIn: 'root' })
export class AddonModForumWSService {

    protected static readonly ROOT_CACHE_KEY = 'mmaModForum:';

    /**
     * Returns whether or not deletePost WS available or not.
     *
     * @returns If WS is available.
     * @since 3.8
     */
    isDeletePostAvailable(): boolean {
        return CoreSites.wsAvailableInCurrentSite('mod_forum_delete_post');
    }

    /**
     * Delete a post.
     *
     * @param postId Post id.
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved when done.
     * @since 3.8
     */
    async deletePost(postId: number, siteId?: string): Promise<AddonModForumDeletePostWSResponse> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonModForumDeletePostWSParams = {
            postid: postId,
        };

        return site.write('mod_forum_delete_post', params);
    }

    /**
     * Returns whether or not updatePost WS available or not.
     *
     * @returns If WS is available.
     * @since 3.8
     */
    isUpdatePostAvailable(): boolean {
        return CoreSites.wsAvailableInCurrentSite('mod_forum_update_discussion_post');
    }

    /**
     * Update a certain post.
     *
     * @param postId ID of the post being edited.
     * @param subject New post's subject.
     * @param message New post's message.
     * @param options Options (subscribe, attachments, ...).
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with success boolean when done.
     */
    async updatePost(
        postId: number,
        subject: string,
        message: string,
        options?: AddonModForumUpdateDiscussionPostWSOptionsObject,
        siteId?: string,
    ): Promise<AddonModForumUpdateDiscussionPostWSResponse> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonModForumUpdateDiscussionPostWSParams = {
            postid: postId,
            subject: subject,
            message: message,

            options: CoreObject.toArrayOfObjects<
                AddonModForumUpdateDiscussionPostWSOptionsArray[0],
                AddonModForumUpdateDiscussionPostWSOptionsObject
            >(
                options || {},
                'name',
                'value',
            ),
        };

        return site.write('mod_forum_update_discussion_post', params);
    }

    /**
     * Returns whether or not setReadState WS available or not.
     *
     * @returns If WS is available.
     * @since 5.3
     */
    isSetReadStateAvailable(): boolean {
        return CoreSites.wsAvailableInCurrentSite('mod_forum_set_read_state');
    }

    /**
     * Set the read/unread state of a forum post.
     *
     * @param postId Post ID.
     * @param targetState Target read state (true = read, false = unread).
     * @param siteId Site ID. If not defined, current site.
     * @returns Promise resolved with the WS response.
     */
    async setReadState(postId: number, targetState: boolean, siteId?: string): Promise<AddonModForumSetReadStateWSResponse> {
        const site = await CoreSites.getSite(siteId);

        const params: AddonModForumSetReadStateWSParams = {
            postid: postId,
            targetstate: targetState,
        };

        return site.write('mod_forum_set_read_state', params);
    }

}
export const AddonModForumWS = makeSingleton(AddonModForumWSService);

/**
 * Params of mod_forum_delete_post WS.
 */
type AddonModForumDeletePostWSParams = {
    postid: number; // Post to be deleted. It can be a discussion topic post.
};

/**
 * Data returned by mod_forum_delete_post WS.
 */
export type AddonModForumDeletePostWSResponse = CoreStatusWithWarningsWSResponse;

/**
 * Params of mod_forum_update_discussion_post WS.
 */
type AddonModForumUpdateDiscussionPostWSParams = {
    postid: number; // Post to be updated. It can be a discussion topic post.
    subject?: string; // Updated post subject.
    message?: string; // Updated post message (HTML assumed if messageformat is not provided).
    messageformat?: CoreTextFormat; // Message format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    options?: AddonModForumUpdateDiscussionPostWSOptionsArray; // Configuration options for the post.
};

/**
 * Data returned by mod_forum_update_discussion_post WS.
 */
type AddonModForumUpdateDiscussionPostWSResponse = CoreStatusWithWarningsWSResponse;

/**
 * Array options of mod_forum_update_discussion_post WS.
 */
type AddonModForumUpdateDiscussionPostWSOptionsArray = {
    // Option name.
    name: 'pinned' | 'discussionsubscribe' | 'inlineattachmentsid' | 'attachmentsid';

    // Option value.
    // This param is validated in the external function, expected values are:
    // pinned              (bool) - (only for discussions) whether to pin this discussion or not
    // discussionsubscribe (bool) - whether to subscribe to the post or not
    // inlineattachmentsid (int)  - the draft file area id for inline attachments in the text
    // attachmentsid       (int)  - the draft file area id for attachments.
    value: string; // The value of the option.
}[];

/**
 * Object options of mod_forum_update_discussion_post WS.
 */
export type AddonModForumUpdateDiscussionPostWSOptionsObject = {
    pinned?: boolean;
    discussionsubscribe?: boolean;
    inlineattachmentsid?: number;
    attachmentsid?: number;
};

/**
 * Params of mod_forum_set_read_state WS.
 *
 * Web Service to control the read/unread state of a forum post.
 */
type AddonModForumSetReadStateWSParams = {
    postid: number; // Identifier of the post whose read state will be changed.
    targetstate: boolean; // Target read state (true = read, false = unread).
};

export type AddonModForumSetReadStateWSResponse = CoreStatusWithWarningsWSResponse;
