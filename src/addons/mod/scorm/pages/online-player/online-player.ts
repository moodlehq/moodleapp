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

import { Component, OnInit, OnDestroy, viewChild, effect } from '@angular/core';
import { CoreNavigator } from '@services/navigator';
import { CoreSitesReadingStrategy } from '@services/sites';
import { CoreEvents } from '@singletons/events';
import {
    AddonModScorm,
    AddonModScormAttemptCountResult,
    AddonModScormGetScormAccessInformationWSResponse,
    AddonModScormScorm,
    AddonModScormScoWithData,
} from '../../services/scorm';
import { AddonModScormHelper } from '../../services/scorm-helper';
import { AddonModScormMode } from '../../constants';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreNetwork } from '@services/network';
import { Translate } from '@singletons';
import { CoreError } from '@classes/errors/error';
import { CoreWait } from '@singletons/wait';
import { CoreIframeComponent } from '@components/iframe/iframe';
import { CoreAlerts } from '@services/overlays/alerts';

/**
 * Page that allows playing a SCORM in online, served from the server.
 */
@Component({
    selector: 'page-addon-mod-scorm-online-player',
    templateUrl: 'online-player.html',
    imports: [
        CoreSharedModule,
    ],
})
export default class AddonModScormOnlinePlayerPage implements OnInit, OnDestroy {

    readonly iframe = viewChild(CoreIframeComponent);

    scorm!: AddonModScormScorm; // The SCORM object.
    loaded = false; // Whether the data has been loaded.
    src?: string; // Iframe src.
    errorMessage?: string; // Error message.
    scormWidth?: number; // Width applied to scorm iframe.
    scormHeight?: number; // Height applied to scorm iframe.
    cmId!: number; // Course module ID.
    courseId!: number; // Course ID.
    enableFullScreenOnRotate = false;

    protected mode!: AddonModScormMode; // Mode to play the SCORM.
    protected moduleUrl!: string; // Module URL.
    protected newAttempt = false; // Whether to start a new attempt.
    protected organizationId?: string; // Organization ID to load.
    protected attempt = 0; // The attempt number.
    protected initialScoId?: number; // Initial SCO ID to load.
    protected isDestroyed = false;

    constructor() {
        const isOnlineOnEnter = CoreNetwork.isOnline();

        effect(() => {
            const isOnline = CoreNetwork.isOnline();
            if (!isOnline && isOnlineOnEnter) {
                // User lost connection while playing an online package. Show an error.
                CoreAlerts.showError(new CoreError(Translate.instant('core.course.changesofflinemaybelost'), {
                    title: Translate.instant('core.youreoffline'),
                }));
            }
        });
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            this.cmId = CoreNavigator.getRequiredRouteNumberParam('cmId');
            this.courseId = CoreNavigator.getRequiredRouteNumberParam('courseId');
            this.mode = CoreNavigator.getRouteParam('mode') || AddonModScormMode.NORMAL;
            this.moduleUrl = CoreNavigator.getRouteParam('moduleUrl') || '';
            this.newAttempt = !!CoreNavigator.getRouteBooleanParam('newAttempt');
            this.organizationId = CoreNavigator.getRouteParam('organizationId');
            this.initialScoId = CoreNavigator.getRouteNumberParam('scoId');
        } catch (error) {
            CoreAlerts.showError(error);
            CoreNavigator.back();

            return;
        }

        try {
            // Fetch the SCORM data.
            await this.fetchData();

            if (!this.src) {
                CoreNavigator.back();

                return;
            }
        } finally {
            this.loaded = true;
        }
    }

    /**
     * Initialize.
     */
    protected async initialize(): Promise<void> {
        // Get the SCORM instance.
        this.scorm = await AddonModScorm.getScorm(this.courseId, this.cmId, {
            moduleUrl: this.moduleUrl,
            readingStrategy: CoreSitesReadingStrategy.PREFER_CACHE,
        });

        if (!this.scorm.popup || !this.scorm.width || this.scorm.width <= 100) {
            return;
        }

        // If we receive a value > 100 we assume it's a fixed pixel size.
        this.scormWidth = this.scorm.width;

        // Only get fixed size on height if width is also fixed.
        if (this.scorm.height && this.scorm.height > 100) {
            this.scormHeight = this.scorm.height;
        }
    }

    /**
     * Determine the attempt to use, the mode (normal/preview) and if it's offline or online.
     *
     * @param attemptsData Attempts count.
     * @param accessInfo Access info.
     */
    protected async determineAttemptAndMode(
        attemptsData: AddonModScormAttemptCountResult,
        accessInfo: AddonModScormGetScormAccessInformationWSResponse,
    ): Promise<void> {
        const data = await AddonModScormHelper.determineAttemptToContinue(this.scorm, attemptsData);

        let incomplete = false;
        this.attempt = data.num;

        // Check if current attempt is incomplete.
        if (this.attempt > 0) {
            incomplete = await AddonModScorm.isAttemptIncomplete(this.scorm.id, this.attempt, {
                cmId: this.cmId,
            });
        }

        // Determine mode and attempt to use.
        const result = AddonModScorm.determineAttemptAndMode(
            this.scorm,
            this.mode,
            this.attempt,
            this.newAttempt,
            incomplete,
            accessInfo.cansavetrack,
        );

        if (result.attempt > this.attempt) {
            // We're creating a new attempt, verify that we can create a new online attempt. We ignore cache.
            await AddonModScorm.getScormUserData(this.scorm.id, result.attempt, {
                cmId: this.cmId,
                readingStrategy: CoreSitesReadingStrategy.ONLY_NETWORK,
            });
        }

        this.mode = result.mode;
        this.newAttempt = result.newAttempt;
        this.attempt = result.attempt;
    }

    /**
     * Fetch data needed to play the SCORM.
     */
    protected async fetchData(): Promise<void> {
        await this.initialize();

        try {
            // Get attempts data.
            const [attemptsData, accessInfo] = await Promise.all([
                AddonModScorm.getAttemptCount(this.scorm.id, { cmId: this.cmId }),
                AddonModScorm.getAccessInformation(this.scorm.id, {
                    cmId: this.cmId,
                }),
            ]);

            await this.determineAttemptAndMode(attemptsData, accessInfo);

            const sco = await this.getScoToLoad();
            if (!sco) {
                // We couldn't find a SCO to load: they're all inactive or without launch URL.
                this.errorMessage = 'addon.mod_scorm.errornovalidsco';

                return;
            }

            // Load SCO.
            this.src = await AddonModScorm.getScoSrcForOnlinePlayer(this.scorm, sco, {
                mode: this.mode,
                organization: this.organizationId,
                newAttempt: this.newAttempt,
            });
        } catch (error) {
            CoreAlerts.showError(error, { default: Translate.instant('addon.mod_scorm.errorgetscorm') });
        }
    }

    /**
     * Fetch the TOC.
     *
     * @returns SCO to load.
     */
    protected async getScoToLoad(): Promise<AddonModScormScoWithData | undefined> {
        // We need to check incomplete again: attempt number or status might have changed.
        const incomplete = await AddonModScorm.isAttemptIncomplete(this.scorm.id, this.attempt, {
            cmId: this.cmId,
        });

        // Get TOC.
        const toc = await AddonModScormHelper.getToc(this.scorm.id, this.attempt, incomplete, {
            organization: this.organizationId,
            cmId: this.cmId,
        });

        if (this.newAttempt) {
            // Creating a new attempt, use the first SCO defined by the SCORM.
            this.initialScoId = this.scorm.launch;
        }

        // Determine current SCO if we received an ID.
        let currentSco: AddonModScormScoWithData | undefined;
        if (this.initialScoId && this.initialScoId > 0) {
            // SCO set by parameter, get it from TOC.
            currentSco = AddonModScormHelper.getScoFromToc(toc, this.initialScoId);
        }

        if (currentSco) {
            return currentSco;
        }

        // No SCO defined. Get the first valid one.
        return await AddonModScormHelper.getFirstSco(this.scorm.id, this.attempt, {
            toc,
            organization: this.organizationId,
            mode: this.mode,
            cmId: this.cmId,
        });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.isDestroyed = true;

        // Empty src when leaving the state so unload event is triggered in the iframe.
        this.src = '';
        CoreEvents.trigger(CoreEvents.ACTIVITY_DATA_SENT, { module: 'scorm' });
    }

    /**
     * SCORM iframe has been loaded.
     */
    async iframeLoaded(): Promise<void> {
        // When using online player, some packages don't calculate the right height. Sending a 'resize' event doesn't fix it, but
        // changing the iframe size makes the SCORM recalculate the size.
        // Wait 1 second (to let inner iframes load) and then force full screen to make the SCORM recalculate the size.
        await CoreWait.wait(1000);

        if (this.isDestroyed) {
            return;
        }

        this.iframe()?.toggleFullscreen(true);
        this.enableFullScreenOnRotate = true;
    }

}
