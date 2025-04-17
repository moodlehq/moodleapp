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

import { Type } from '@angular/core';

import { AddonModQuizAccessRuleHandler } from '@addons/mod/quiz/services/access-rules-delegate';
import { CoreSitePluginsQuizAccessRuleComponent } from '../../components/quiz-access-rule/quiz-access-rule';

/**
 * Handler to display a quiz access rule site plugin.
 */
export class CoreSitePluginsQuizAccessRuleHandler implements AddonModQuizAccessRuleHandler {

    constructor(public name: string, public ruleName: string, public hasTemplate: boolean) { }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * @inheritdoc
     */
    isPreflightCheckRequired(): boolean {
        return this.hasTemplate;
    }

    /**
     * @inheritdoc
     */
    getFixedPreflightData(): void {
        // Nothing to do.
    }

    /**
     * @inheritdoc
     */
    getPreflightComponent(): undefined | Type<unknown> {
        if (this.hasTemplate) {
            return CoreSitePluginsQuizAccessRuleComponent;
        }
    }

    /**
     * @inheritdoc
     */
    notifyPreflightCheckPassed(): void {
        // Nothing to do.
    }

    /**
     * @inheritdoc
     */
    notifyPreflightCheckFailed(): void {
        // Nothing to do.
    }

    /**
     * @inheritdoc
     */
    shouldShowTimeLeft(): boolean {
        return false;
    }

}
