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

/**
 * Encapsulates the support affordances a user has access to.
 */
export abstract class CoreUserSupportConfig {

    /**
     * Check whether the user can contact support or not.
     *
     * @returns Whether the user can contact support.
     */
    public abstract canContactSupport(): boolean;

    /**
     * Get language used in the support page, if any.
     *
     * @returns Support page language.
     */
    public abstract getSupportPageLang(): string | null;

    /**
     * Get url to use for contacting support.
     *
     * @returns Support page url.
     */
    getSupportPageUrl(): string {
        if (!this.canContactSupport()) {
            throw new Error('Can\'t get support page url');
        }

        return this.buildSupportPageUrl();
    }

    /**
     * Build page url string with the internal information.
     *
     * @returns Support page url.
     */
    protected abstract buildSupportPageUrl(): string;

}
