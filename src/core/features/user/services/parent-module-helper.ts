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
import { CoreUserParent } from './parent';
import { makeSingleton } from '@singletons';

/**
 * Helper service for parent viewing of modules.
 */
@Injectable({ providedIn: 'root' })
export class CoreUserParentModuleHelperProvider {

    /**
     * Check if parent is viewing as mentee and wrap the web service call.
     * 
     * @param wsName Original web service name
     * @param params Original parameters
     * @param customWsName Custom web service name for parent viewing
     * @param siteId Site ID
     * @returns Object with wsName and params to use
     */
    async getParentViewingWS(
        wsName: string,
        params: any,
        customWsName: string,
        siteId?: string
    ): Promise<{ wsName: string; params: any }> {
        const site = await CoreSites.getSite(siteId);
        const selectedMenteeId = await CoreUserParent.getSelectedMentee(site.getId());
        
        if (selectedMenteeId && selectedMenteeId !== site.getUserId()) {
            // Parent viewing mentee content
            const hasCustomWS = await site.wsAvailable(customWsName);
            if (hasCustomWS) {
                console.log(`[ParentModuleHelper] Using custom WS ${customWsName} for parent viewing`);
                return {
                    wsName: customWsName,
                    params: {
                        ...params,
                        userid: selectedMenteeId
                    }
                };
            }
        }
        
        return { wsName, params };
    }

    /**
     * Check if we should skip certain operations for parent viewing.
     * 
     * @param siteId Site ID
     * @returns True if parent is viewing as mentee
     */
    async isParentViewingMentee(siteId?: string): Promise<boolean> {
        const site = await CoreSites.getSite(siteId);
        const selectedMenteeId = await CoreUserParent.getSelectedMentee(site.getId());
        
        return !!(selectedMenteeId && selectedMenteeId !== site.getUserId());
    }

    /**
     * Get appropriate error message for parent viewing restrictions.
     * 
     * @param operation Operation being attempted
     * @returns Error message
     */
    getParentRestrictionMessage(operation: string): string {
        return `Parents cannot ${operation} on behalf of their children.`;
    }
}

export const CoreUserParentModuleHelper = makeSingleton(CoreUserParentModuleHelperProvider);