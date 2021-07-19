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

import { AddonMessageOutputDelegate } from '@addons/messageoutput/services/messageoutput-delegate';
import { AddonModAssignFeedbackDelegate } from '@addons/mod/assign/services/feedback-delegate';
import { AddonModAssignSubmissionDelegate } from '@addons/mod/assign/services/submission-delegate';
import { AddonModQuizAccessRuleDelegate } from '@addons/mod/quiz/services/access-rules-delegate';
import { CoreDelegate, CoreDelegateHandler } from '@classes/delegate';
import { CoreError } from '@classes/errors/error';
import { CoreSite, CoreSiteWSPreSets } from '@classes/site';
import { CoreBlockDelegate } from '@features/block/services/block-delegate';
import { CoreCompile } from '@features/compile/services/compile';
import { CoreCourseOptionsDelegate } from '@features/course/services/course-options-delegate';
import { CoreCourseFormatDelegate } from '@features/course/services/format-delegate';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { CoreCoursesProvider } from '@features/courses/services/courses';
import { CoreMainMenuDelegate } from '@features/mainmenu/services/mainmenu-delegate';
import { CoreQuestionBehaviourDelegate } from '@features/question/services/behaviour-delegate';
import { CoreQuestionDelegate } from '@features/question/services/question-delegate';
import { CoreSettingsDelegate } from '@features/settings/services/settings-delegate';
import { CoreUserDelegate } from '@features/user/services/user-delegate';
import { CoreUserProfileFieldDelegate } from '@features/user/services/user-profile-field-delegate';
import { CoreFilepool } from '@services/filepool';
import { CoreLang } from '@services/lang';
import { CoreSites } from '@services/sites';
import { CoreTextUtils } from '@services/utils/text';
import { CoreUrlUtils } from '@services/utils/url';
import { CoreUtils } from '@services/utils/utils';
import { CoreWS } from '@services/ws';
import { CoreEvents } from '@singletons/events';
import { CoreLogger } from '@singletons/logger';
import { CoreSitePluginsAssignFeedbackHandler } from '../classes/handlers/assign-feedback-handler';
import { CoreSitePluginsAssignSubmissionHandler } from '../classes/handlers/assign-submission-handler';
import { CoreSitePluginsBlockHandler } from '../classes/handlers/block-handler';
import { CoreSitePluginsCourseFormatHandler } from '../classes/handlers/course-format-handler';
import { CoreSitePluginsCourseOptionHandler } from '../classes/handlers/course-option-handler';
import { CoreSitePluginsMainMenuHandler } from '../classes/handlers/main-menu-handler';
import { CoreSitePluginsMessageOutputHandler } from '../classes/handlers/message-output-handler';
import { CoreSitePluginsModuleHandler } from '../classes/handlers/module-handler';
import { CoreSitePluginsModulePrefetchHandler } from '../classes/handlers/module-prefetch-handler';
import { CoreSitePluginsQuestionBehaviourHandler } from '../classes/handlers/question-behaviour-handler';
import { CoreSitePluginsQuestionHandler } from '../classes/handlers/question-handler';
import { CoreSitePluginsQuizAccessRuleHandler } from '../classes/handlers/quiz-access-rule-handler';
import { CoreSitePluginsSettingsHandler } from '../classes/handlers/settings-handler';
import { CoreSitePluginsUserProfileHandler } from '../classes/handlers/user-handler';
import { CoreSitePluginsUserProfileFieldHandler } from '../classes/handlers/user-profile-field-handler';
import {
    CoreSitePlugins,
    CoreSitePluginsContent,
    CoreSitePluginsPlugin,
    CoreSitePluginsHandlerData,
    CoreSitePluginsProvider,
    CoreSitePluginsCourseOptionHandlerData,
    CoreSitePluginsMainMenuHandlerData,
    CoreSitePluginsCourseModuleHandlerData,
    CoreSitePluginsCourseFormatHandlerData,
    CoreSitePluginsUserHandlerData,
    CoreSitePluginsSettingsHandlerData,
    CoreSitePluginsMessageOutputHandlerData,
    CoreSitePluginsBlockHandlerData,
    CoreSitePluginsHandlerCommonData,
    CoreSitePluginsInitHandlerData,
    CoreSitePluginsMainMenuHomeHandlerData,
} from './siteplugins';
import { makeSingleton } from '@singletons';
import { CoreMainMenuHomeDelegate } from '@features/mainmenu/services/home-delegate';
import { CoreSitePluginsMainMenuHomeHandler } from '../classes/handlers/main-menu-home-handler';
import { AddonWorkshopAssessmentStrategyDelegate } from '@addons/mod/workshop/services/assessment-strategy-delegate';
import { CoreSitePluginsWorkshopAssessmentStrategyHandler } from '../classes/handlers/workshop-assessment-strategy-handler';

const HANDLER_DISABLED = 'core_site_plugins_helper_handler_disabled';

/**
 * Helper service to provide functionalities regarding site plugins. It basically has the features to load and register site
 * plugin.
 *
 * This code is split from CoreSitePluginsProvider to prevent circular dependencies.
 *
 * @todo: Support ViewChild and similar in site plugins. Possible solution: make components and directives inject the instance
 * inside the host DOM element?
 */
@Injectable({ providedIn: 'root' })
export class CoreSitePluginsHelperProvider {

    protected logger: CoreLogger;
    protected courseRestrictHandlers: Record<string, {
        plugin: CoreSitePluginsPlugin;
        handlerName: string;
        handlerSchema: CoreSitePluginsCourseOptionHandlerData | CoreSitePluginsUserHandlerData;
        handler: CoreSitePluginsCourseOptionHandler | CoreSitePluginsUserProfileHandler;
    }> = {};

    constructor() {
        this.logger = CoreLogger.getInstance('CoreSitePluginsHelperProvider');
    }

    /**
     * Initialize.
     */
    initialize(): void {
        // Fetch the plugins on login.
        CoreEvents.on(CoreEvents.LOGIN, async (data) => {
            try {
                const plugins = await CoreUtils.ignoreErrors(CoreSitePlugins.getPlugins(data.siteId));

                // Plugins fetched, check that site hasn't changed.
                if (data.siteId != CoreSites.getCurrentSiteId() || !plugins?.length) {
                    return;
                }

                // Site is still the same. Load the plugins and trigger the event.
                try {
                    await this.loadSitePlugins(plugins);
                } finally {
                    CoreEvents.trigger(CoreEvents.SITE_PLUGINS_LOADED, {}, data.siteId);
                }
            } catch (error) {
                this.logger.error(error);
            } finally {
                CoreSitePlugins.setPluginsFetched();
            }
        });

        // Re-load plugins restricted for courses when the list of user courses changes.
        CoreEvents.on(CoreCoursesProvider.EVENT_MY_COURSES_CHANGED, (data) => {
            if (data && data.siteId && data.siteId == CoreSites.getCurrentSiteId() && data.added && data.added.length) {
                this.reloadCourseRestrictHandlers();
            }
        });
    }

    /**
     * Download the styles for a handler (if any).
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param handlerSchema Data about the handler.
     * @param siteId Site ID. If not provided, current site.
     * @return Promise resolved with the CSS code.
     */
    async downloadStyles(
        plugin: CoreSitePluginsPlugin,
        handlerName: string,
        handlerSchema: CoreSitePluginsHandlerData,
        siteId?: string,
    ): Promise<string> {
        const site = await CoreSites.getSite(siteId);

        // Get the absolute URL. If it's a relative URL, add the site URL to it.
        let url = handlerSchema.styles?.url;
        if (url && !CoreUrlUtils.isAbsoluteURL(url)) {
            url = CoreTextUtils.concatenatePaths(site.getURL(), url);
        }

        if (url && handlerSchema.styles?.version) {
            // Add the version to the URL to prevent getting a cached file.
            url += (url.indexOf('?') != -1 ? '&' : '?') + 'version=' + handlerSchema.styles.version;
        }

        const uniqueName = CoreSitePlugins.getHandlerUniqueName(plugin, handlerName);
        const componentId = uniqueName + '#main';

        // Remove the CSS files for this handler that aren't used anymore. Don't block the call for this.
        const files = await CoreUtils.ignoreErrors(
            CoreFilepool.getFilesByComponent(site.getId(), CoreSitePluginsProvider.COMPONENT, componentId),
        );

        files?.forEach((file) => {
            if (file.url != url) {
                // It's not the current file, delete it.
                CoreUtils.ignoreErrors(CoreFilepool.removeFileByUrl(site.getId(), file.url));
            }
        });

        if (!url) {
            // No styles.
            return '';
        }

        // Download the file if not downloaded or the version changed.
        const path = await CoreFilepool.downloadUrl(
            site.getId(),
            url,
            false,
            CoreSitePluginsProvider.COMPONENT,
            componentId,
            0,
            undefined,
            undefined,
            undefined,
            handlerSchema.styles!.version,
        );

        // File is downloaded, get the contents.
        return CoreWS.getText(path);
    }

    /**
     * Execute a handler's init method if it has any.
     *
     * @param plugin Data of the plugin.
     * @param handlerSchema Data about the handler.
     * @return Promise resolved when done. It returns the results of the getContent call and the data returned by
     *         the init JS (if any).
     */
    protected async executeHandlerInit(
        plugin: CoreSitePluginsPlugin,
        handlerSchema: CoreSitePluginsHandlerData,
    ): Promise<CoreSitePluginsContent | null> {
        if (!handlerSchema.init) {
            return null;
        }

        return this.executeMethodAndJS(plugin, handlerSchema.init, true);
    }

    /**
     * Execute a get_content method and run its javascript (if any).
     *
     * @param plugin Data of the plugin.
     * @param method The method to call.
     * @param isInit Whether it's the init method.
     * @return Promise resolved with the results of the getContent call and the data returned by the JS (if any).
     */
    protected async executeMethodAndJS(
        plugin: CoreSitePluginsPlugin,
        method: string,
        isInit?: boolean,
    ): Promise<CoreSitePluginsContent> {
        const siteId = CoreSites.getCurrentSiteId();
        const preSets: CoreSiteWSPreSets = {
            getFromCache: false, // Try to ignore cache.
            deleteCacheIfWSError: isInit, // If the init WS call returns an exception we won't use cached data.
        };

        const result = <CoreSitePluginsContent> await CoreSitePlugins.getContent(plugin.component, method, {}, preSets);

        if (!result.javascript || CoreSites.getCurrentSiteId() != siteId) {
            // No javascript or site has changed, stop.
            return result;
        }

        // Create a "fake" instance to hold all the libraries.
        const instance = {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            HANDLER_DISABLED: HANDLER_DISABLED,
        };
        CoreCompile.injectLibraries(instance);

        // Add some data of the WS call result.
        const jsData = CoreSitePlugins.createDataForJS(result);
        for (const name in jsData) {
            instance[name] = jsData[name];
        }

        // Now execute the javascript using this instance.
        result.jsResult = CoreCompile.executeJavascript(instance, result.javascript);

        if (result.jsResult == HANDLER_DISABLED) {
            // The "disabled" field was added in 3.8, this is a workaround for previous versions.
            result.disabled = true;
        }

        return result;
    }

    /**
     * Fetch site plugins.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done. Returns the list of plugins to load.
     * @deprecated since 3.9.5. The function was moved to CoreSitePlugins.getPlugins.
     */
    async fetchSitePlugins(siteId?: string): Promise<CoreSitePluginsPlugin[]> {
        return CoreSitePlugins.getPlugins(siteId);
    }

    /**
     * Given an addon name, return the prefix to add to its string keys.
     *
     * @param addon Name of the addon (plugin.addon).
     * @return Prefix.
     */
    protected getPrefixForStrings(addon: string): string {
        if (addon) {
            return 'plugin.' + addon + '.';
        }

        return '';
    }

    /**
     * Given an addon name and the key of a string, return the full string key (prefixed).
     *
     * @param addon Name of the addon (plugin.addon).
     * @param key The key of the string.
     * @return Full string key.
     */
    protected getPrefixedString(addon: string, key: string): string {
        return this.getPrefixForStrings(addon) + key;
    }

    /**
     * Check if a certain plugin is a site plugin and it's enabled in a certain site.
     *
     * @param plugin Data of the plugin.
     * @param site Site affected.
     * @return Whether it's a site plugin and it's enabled.
     * @deprecated since 3.9.5. The function was moved to CoreSitePlugins.isSitePluginEnabled.
     */
    isSitePluginEnabled(plugin: CoreSitePluginsPlugin, site: CoreSite): boolean {
        return CoreSitePlugins.isSitePluginEnabled(plugin, site);
    }

    /**
     * Load the lang strings for a plugin.
     *
     * @param plugin Data of the plugin.
     */
    loadLangStrings(plugin: CoreSitePluginsPlugin): void {
        if (!plugin.parsedLang) {
            return;
        }

        for (const lang in plugin.parsedLang) {
            const prefix = this.getPrefixForStrings(plugin.addon);

            CoreLang.addSitePluginsStrings(lang, plugin.parsedLang[lang], prefix);
        }
    }

    /**
     * Load a site plugin.
     *
     * @param plugin Data of the plugin.
     * @return Promise resolved when loaded.
     */
    async loadSitePlugin(plugin: CoreSitePluginsPlugin): Promise<void> {
        this.logger.debug('Load site plugin:', plugin);

        if (!plugin.parsedHandlers && plugin.handlers) {
            plugin.parsedHandlers = CoreTextUtils.parseJSON(
                plugin.handlers,
                null,
                this.logger.error.bind(this.logger, 'Error parsing site plugin handlers'),
            );
        }

        if (!plugin.parsedLang && plugin.lang) {
            plugin.parsedLang = CoreTextUtils.parseJSON(
                plugin.lang,
                null,
                this.logger.error.bind(this.logger, 'Error parsing site plugin lang'),
            );
        }

        CoreSitePlugins.setPluginsLoaded(true);

        // Register lang strings.
        this.loadLangStrings(plugin);

        if (plugin.parsedHandlers) {
            // Register all the handlers.
            await CoreUtils.allPromises(Object.keys(plugin.parsedHandlers).map(async (name) => {
                await this.registerHandler(plugin, name, plugin.parsedHandlers![name]);
            }));
        }
    }

    /**
     * Load site plugins.
     *
     * @param plugins The plugins to load.
     * @return Promise resolved when loaded.
     */
    async loadSitePlugins(plugins: CoreSitePluginsPlugin[]): Promise<void> {
        this.courseRestrictHandlers = {};

        await CoreUtils.allPromises(plugins.map(async (plugin) => {
            const pluginPromise = this.loadSitePlugin(plugin);
            CoreSitePlugins.registerSitePluginPromise(plugin.component, pluginPromise);

            await pluginPromise;
        }));
    }

    /**
     * Load the styles for a handler.
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param fileUrl CSS file URL.
     * @param cssCode CSS code.
     * @param version Styles version.
     * @param siteId Site ID. If not provided, current site.
     */
    loadStyles(
        plugin: CoreSitePluginsPlugin,
        handlerName: string,
        fileUrl: string,
        cssCode: string,
        version?: number,
        siteId?: string,
    ): void {
        siteId = siteId || CoreSites.getCurrentSiteId();

        // Create the style and add it to the header.
        const styleEl = document.createElement('style');
        const uniqueName = CoreSitePlugins.getHandlerUniqueName(plugin, handlerName);

        styleEl.setAttribute('id', 'siteplugin-' + uniqueName);
        styleEl.innerHTML = cssCode;

        // To ensure consistency, insert in alphabetical order among other site plugin styles.
        let lowestGreater: HTMLStyleElement | null = null;
        Array.from(document.head.querySelectorAll('style')).forEach((other) => {
            if (/^siteplugin-/.test(other.id) && other.id > styleEl.id) {
                if (lowestGreater === null || other.id < lowestGreater.id) {
                    lowestGreater = other;
                }
            }
        });

        if (lowestGreater) {
            document.head.insertBefore(styleEl, lowestGreater);
        } else {
            document.head.appendChild(styleEl);
        }

        // Styles have been loaded, now treat the CSS.
        CoreUtils.ignoreErrors(
            CoreFilepool.treatCSSCode(siteId, fileUrl, cssCode, CoreSitePluginsProvider.COMPONENT, uniqueName, version),
        );
    }

    /**
     * Register a site plugin handler in the right delegate.
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param handlerSchema Data about the handler.
     * @return Promise resolved when done.
     */
    async registerHandler(
        plugin: CoreSitePluginsPlugin,
        handlerName: string,
        handlerSchema: CoreSitePluginsHandlerData,
    ): Promise<void> {
        // Wait for the init JS to be executed and for the styles to be downloaded.
        const siteId = CoreSites.getCurrentSiteId();

        try {
            const [initResult, cssCode] = await Promise.all([
                this.executeHandlerInit(plugin, handlerSchema),
                this.downloadStyles(plugin, handlerName, handlerSchema, siteId).catch((error) => {
                    this.logger.error('Error getting styles for plugin', handlerName, handlerSchema, error);
                }),
            ]);

            if (initResult?.disabled) {
                // This handler is disabled for the current user, stop.
                this.logger.warn('Handler disabled by init function', plugin, handlerSchema);

                return;
            }

            if (cssCode) {
                // Load the styles.
                this.loadStyles(plugin, handlerName, handlerSchema.styles!.url!, cssCode, handlerSchema.styles!.version, siteId);
            }

            let uniqueName: string | undefined;

            switch (handlerSchema.delegate) {
                case 'CoreMainMenuDelegate':
                    uniqueName = await this.registerMainMenuHandler(plugin, handlerName, handlerSchema, initResult);
                    break;

                case 'CoreCourseModuleDelegate':
                    uniqueName = await this.registerModuleHandler(plugin, handlerName, handlerSchema, initResult);
                    break;

                case 'CoreUserDelegate':
                    uniqueName = await this.registerUserProfileHandler(plugin, handlerName, handlerSchema, initResult);
                    break;

                case 'CoreCourseOptionsDelegate':
                    uniqueName = await this.registerCourseOptionHandler(plugin, handlerName, handlerSchema, initResult);
                    break;

                case 'CoreCourseFormatDelegate':
                    uniqueName = await this.registerCourseFormatHandler(plugin, handlerName, handlerSchema);
                    break;

                case 'CoreUserProfileFieldDelegate':
                    uniqueName = await this.registerUserProfileFieldHandler(plugin, handlerName, handlerSchema);
                    break;

                case 'CoreSettingsDelegate':
                    uniqueName = await this.registerSettingsHandler(plugin, handlerName, handlerSchema, initResult);
                    break;

                case 'CoreQuestionDelegate':
                    uniqueName = await this.registerQuestionHandler(plugin, handlerName, handlerSchema);
                    break;

                case 'CoreQuestionBehaviourDelegate':
                    uniqueName = await this.registerQuestionBehaviourHandler(plugin, handlerName, handlerSchema);
                    break;

                case 'CoreBlockDelegate':
                    uniqueName = await this.registerBlockHandler(plugin, handlerName, handlerSchema, initResult);
                    break;

                case 'AddonMessageOutputDelegate':
                    uniqueName = await this.registerMessageOutputHandler(plugin, handlerName, handlerSchema, initResult);
                    break;

                case 'AddonModQuizAccessRuleDelegate':
                    uniqueName = await this.registerQuizAccessRuleHandler(plugin, handlerName, handlerSchema);
                    break;

                case 'AddonModAssignFeedbackDelegate':
                    uniqueName = await this.registerAssignFeedbackHandler(plugin, handlerName, handlerSchema);
                    break;

                case 'AddonModAssignSubmissionDelegate':
                    uniqueName = await this.registerAssignSubmissionHandler(plugin, handlerName, handlerSchema);
                    break;

                case 'AddonWorkshopAssessmentStrategyDelegate':
                    uniqueName = await this.registerWorkshopAssessmentStrategyHandler(plugin, handlerName, handlerSchema);
                    break;

                case 'CoreMainMenuHomeDelegate':
                    uniqueName = await this.registerMainMenuHomeHandler(plugin, handlerName, handlerSchema, initResult);
                    break;

                default:
                    // Nothing to do.
            }

            if (uniqueName) {
                // Store the handler data.
                CoreSitePlugins.setSitePluginHandler(uniqueName, {
                    plugin: plugin,
                    handlerName: handlerName,
                    handlerSchema: handlerSchema,
                    initResult,
                });
            }
        } catch (error) {
            throw new CoreError('Error executing init method ' + handlerSchema.init + ': ' + error.message);
        }
    }

    /**
     * Register a handler that relies in a "componentInit" function in a certain delegate.
     * These type of handlers will return a generic template and its JS in the main method, so it will be called
     * before registering the handler.
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param handlerSchema Data about the handler.
     * @return A promise resolved with a string to identify the handler.
     */
    protected async registerComponentInitHandler<T extends CoreDelegateHandler>(
        plugin: CoreSitePluginsPlugin,
        handlerName: string,
        handlerSchema: CoreSitePluginsInitHandlerData,
        delegate: CoreDelegate<T>,
        createHandlerFn: (uniqueName: string, result: CoreSitePluginsContent) => T,
    ): Promise<string | undefined> {

        if (!handlerSchema.method) {
            // Required data not provided, stop.
            this.logger.warn('Ignore site plugin because it doesn\'t provide method', plugin, handlerSchema);

            return;
        }

        this.logger.debug('Register site plugin', plugin, handlerSchema);

        try {
            // Execute the main method and its JS. The template returned will be used in the right component.
            const result = await this.executeMethodAndJS(plugin, handlerSchema.method);

            // Create and register the handler.
            const uniqueName = CoreSitePlugins.getHandlerUniqueName(plugin, handlerName);
            const handler = createHandlerFn(uniqueName, result);

            // Store in handlerSchema some data required by the component.
            handlerSchema.methodTemplates = result.templates;
            handlerSchema.methodJSResult = result.jsResult;
            handlerSchema.methodOtherdata = result.otherdata;

            if (result.jsResult) {
                // Override default handler functions with the result of the method JS.
                const jsResult = <Record<string, unknown>> result.jsResult;
                for (const property in handler) {
                    if (property != 'constructor' && typeof handler[property] == 'function' &&
                            typeof jsResult[property] == 'function') {
                        // eslint-disable-next-line @typescript-eslint/ban-types
                        handler[property] = (<Function> jsResult[property]).bind(handler);
                    }
                }
            }

            delegate.registerHandler(handler);

            return uniqueName;
        } catch (error) {
            this.logger.error('Error executing main method', plugin.component, handlerSchema.method, error);
        }
    }

    /**
     * Given a handler in a plugin, register it in the assign feedback delegate.
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param handlerSchema Data about the handler.
     * @return Promise resolved with a string to identify the handler.
     */
    protected registerAssignFeedbackHandler(
        plugin: CoreSitePluginsPlugin,
        handlerName: string,
        handlerSchema: CoreSitePluginsHandlerCommonData,
    ): Promise<string | undefined> {

        return this.registerComponentInitHandler(
            plugin,
            handlerName,
            handlerSchema,
            AddonModAssignFeedbackDelegate.instance,
            (uniqueName) => {
                const type = (handlerSchema.moodlecomponent || plugin.component).replace('assignfeedback_', '');
                const prefix = this.getPrefixForStrings(plugin.addon);

                return new CoreSitePluginsAssignFeedbackHandler(uniqueName, type, prefix);
            },
        );
    }

    /**
     * Given a handler in a plugin, register it in the assign submission delegate.
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param handlerSchema Data about the handler.
     * @return Promise resolved with a string to identify the handler.
     */
    protected registerAssignSubmissionHandler(
        plugin: CoreSitePluginsPlugin,
        handlerName: string,
        handlerSchema: CoreSitePluginsHandlerCommonData,
    ): Promise<string | undefined> {

        return this.registerComponentInitHandler(
            plugin,
            handlerName,
            handlerSchema,
            AddonModAssignSubmissionDelegate.instance,
            (uniqueName) => {
                const type = (handlerSchema.moodlecomponent || plugin.component).replace('assignsubmission_', '');
                const prefix = this.getPrefixForStrings(plugin.addon);

                return new CoreSitePluginsAssignSubmissionHandler(uniqueName, type, prefix);
            },
        );
    }

    /**
     * Given a handler in a plugin, register it in the block delegate.
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param handlerSchema Data about the handler.
     * @param initResult Result of init function.
     * @return A string to identify the handler.
     */
    protected registerBlockHandler(
        plugin: CoreSitePluginsPlugin,
        handlerName: string,
        handlerSchema: CoreSitePluginsBlockHandlerData,
        initResult: CoreSitePluginsContent | null,
    ): string | undefined {

        const uniqueName = CoreSitePlugins.getHandlerUniqueName(plugin, handlerName);
        const blockName = (handlerSchema.moodlecomponent || plugin.component).replace('block_', '');
        const titleString = handlerSchema.displaydata?.title ?? 'pluginname';
        const prefixedTitle = this.getPrefixedString(plugin.addon, titleString);

        CoreBlockDelegate.registerHandler(
            new CoreSitePluginsBlockHandler(uniqueName, prefixedTitle, blockName, handlerSchema, initResult),
        );

        return uniqueName;
    }

    /**
     * Given a handler in a plugin, register it in the course format delegate.
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param handlerSchema Data about the handler.
     * @return A string to identify the handler.
     */
    protected registerCourseFormatHandler(
        plugin: CoreSitePluginsPlugin,
        handlerName: string,
        handlerSchema: CoreSitePluginsCourseFormatHandlerData,
    ): string {
        this.logger.debug('Register site plugin in course format delegate:', plugin, handlerSchema);

        // Create and register the handler.
        const uniqueName = CoreSitePlugins.getHandlerUniqueName(plugin, handlerName);
        const formatName = (handlerSchema.moodlecomponent || plugin.component).replace('format_', '');
        CoreCourseFormatDelegate.registerHandler(
            new CoreSitePluginsCourseFormatHandler(uniqueName, formatName, handlerSchema),
        );

        return uniqueName;
    }

    /**
     * Given a handler in a plugin, register it in the course options delegate.
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param handlerSchema Data about the handler.
     * @param initResult Result of the init WS call.
     * @return A string to identify the handler.
     */
    protected registerCourseOptionHandler(
        plugin: CoreSitePluginsPlugin,
        handlerName: string,
        handlerSchema: CoreSitePluginsCourseOptionHandlerData,
        initResult: CoreSitePluginsContent | null,
    ): string | undefined {
        if (!handlerSchema.displaydata) {
            // Required data not provided, stop.
            this.logger.warn('Ignore site plugin because it doesn\'t provide displaydata', plugin, handlerSchema);

            return;
        }

        this.logger.debug('Register site plugin in course option delegate:', plugin, handlerSchema, initResult);

        // Create and register the handler.
        const uniqueName = CoreSitePlugins.getHandlerUniqueName(plugin, handlerName);
        const prefixedTitle = this.getPrefixedString(plugin.addon, handlerSchema.displaydata.title || 'pluginname');
        const handler = new CoreSitePluginsCourseOptionHandler(
            uniqueName,
            prefixedTitle,
            plugin,
            handlerSchema,
            initResult,
        );

        CoreCourseOptionsDelegate.registerHandler(handler);

        if (initResult?.restrict?.courses) {
            // This handler is restricted to certan courses, store it in the list.
            this.courseRestrictHandlers[uniqueName] = {
                plugin,
                handlerName,
                handlerSchema,
                handler,
            };
        }

        return uniqueName;
    }

    /**
     * Given a handler in a plugin, register it in the main menu delegate.
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param handlerSchema Data about the handler.
     * @param initResult Result of the init WS call.
     * @return A string to identify the handler.
     */
    protected registerMainMenuHandler(
        plugin: CoreSitePluginsPlugin,
        handlerName: string,
        handlerSchema: CoreSitePluginsMainMenuHandlerData,
        initResult: CoreSitePluginsContent | null,
    ): string | undefined {
        if (!handlerSchema.displaydata) {
            // Required data not provided, stop.
            this.logger.warn('Ignore site plugin because it doesn\'t provide displaydata', plugin, handlerSchema);

            return;
        }

        this.logger.debug('Register site plugin in main menu delegate:', plugin, handlerSchema, initResult);

        // Create and register the handler.
        const uniqueName = CoreSitePlugins.getHandlerUniqueName(plugin, handlerName);
        const prefixedTitle = this.getPrefixedString(plugin.addon, handlerSchema.displaydata.title || 'pluginname');

        CoreMainMenuDelegate.registerHandler(
            new CoreSitePluginsMainMenuHandler(uniqueName, prefixedTitle, plugin, handlerSchema, initResult),
        );

        return uniqueName;
    }

    /**
     * Given a handler in a plugin, register it in the message output delegate.
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param handlerSchema Data about the handler.
     * @param initResult Result of the init WS call.
     * @return A string to identify the handler.
     */
    protected registerMessageOutputHandler(
        plugin: CoreSitePluginsPlugin,
        handlerName: string,
        handlerSchema: CoreSitePluginsMessageOutputHandlerData,
        initResult: CoreSitePluginsContent | null,
    ): string | undefined {
        if (!handlerSchema.displaydata) {
            // Required data not provided, stop.
            this.logger.warn('Ignore site plugin because it doesn\'t provide displaydata', plugin, handlerSchema);

            return;
        }

        this.logger.debug('Register site plugin in message output delegate:', plugin, handlerSchema, initResult);

        // Create and register the handler.
        const uniqueName = CoreSitePlugins.getHandlerUniqueName(plugin, handlerName);
        const prefixedTitle = this.getPrefixedString(plugin.addon, handlerSchema.displaydata.title || 'pluginname');
        const processorName = (handlerSchema.moodlecomponent || plugin.component).replace('message_', '');

        AddonMessageOutputDelegate.registerHandler(
            new CoreSitePluginsMessageOutputHandler(uniqueName, processorName, prefixedTitle, plugin, handlerSchema, initResult),
        );

        return uniqueName;
    }

    /**
     * Given a handler in a plugin, register it in the module delegate.
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param handlerSchema Data about the handler.
     * @param initResult Result of the init WS call.
     * @return A string to identify the handler.
     */
    protected registerModuleHandler(
        plugin: CoreSitePluginsPlugin,
        handlerName: string,
        handlerSchema: CoreSitePluginsCourseModuleHandlerData,
        initResult: CoreSitePluginsContent | null,
    ): string | undefined {
        if (!handlerSchema.displaydata) {
            // Required data not provided, stop.
            this.logger.warn('Ignore site plugin because it doesn\'t provide displaydata', plugin, handlerSchema);

            return;
        }

        this.logger.debug('Register site plugin in module delegate:', plugin, handlerSchema, initResult);

        // Create and register the handler.
        const uniqueName = CoreSitePlugins.getHandlerUniqueName(plugin, handlerName);
        const modName = (handlerSchema.moodlecomponent || plugin.component).replace('mod_', '');

        CoreCourseModuleDelegate.registerHandler(
            new CoreSitePluginsModuleHandler(uniqueName, modName, plugin, handlerSchema, initResult),
        );

        if (handlerSchema.offlinefunctions && Object.keys(handlerSchema.offlinefunctions).length) {
            // Register the prefetch handler.
            CoreCourseModulePrefetchDelegate.registerHandler(
                new CoreSitePluginsModulePrefetchHandler(plugin.component, uniqueName, modName, handlerSchema),
            );
        }

        return uniqueName;
    }

    /**
     * Given a handler in a plugin, register it in the question delegate.
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param handlerSchema Data about the handler.
     * @return Promise resolved with a string to identify the handler.
     */
    protected registerQuestionHandler(
        plugin: CoreSitePluginsPlugin,
        handlerName: string,
        handlerSchema: CoreSitePluginsHandlerCommonData,
    ): Promise<string | undefined> {
        const component = handlerSchema.moodlecomponent || plugin.component;

        return this.registerComponentInitHandler(
            plugin,
            handlerName,
            handlerSchema,
            CoreQuestionDelegate.instance,
            (uniqueName) => new CoreSitePluginsQuestionHandler(uniqueName, component),
        );
    }

    /**
     * Given a handler in a plugin, register it in the question behaviour delegate.
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param handlerSchema Data about the handler.
     * @return Promise resolved with a string to identify the handler.
     */
    protected registerQuestionBehaviourHandler(
        plugin: CoreSitePluginsPlugin,
        handlerName: string,
        handlerSchema: CoreSitePluginsHandlerCommonData,
    ): Promise<string | undefined> {

        return this.registerComponentInitHandler(
            plugin,
            handlerName,
            handlerSchema,
            CoreQuestionBehaviourDelegate.instance,
            (uniqueName, result) => {
                const type = (handlerSchema.moodlecomponent || plugin.component).replace('qbehaviour_', '');

                return new CoreSitePluginsQuestionBehaviourHandler(uniqueName, type, !!result.templates.length);
            },
        );
    }

    /**
     * Given a handler in a plugin, register it in the quiz access rule delegate.
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param handlerSchema Data about the handler.
     * @return Promise resolved with a string to identify the handler.
     */
    protected registerQuizAccessRuleHandler(
        plugin: CoreSitePluginsPlugin,
        handlerName: string,
        handlerSchema: CoreSitePluginsHandlerCommonData,
    ): Promise<string | undefined> {
        const component = handlerSchema.moodlecomponent || plugin.component;

        return this.registerComponentInitHandler(
            plugin,
            handlerName,
            handlerSchema,
            AddonModQuizAccessRuleDelegate.instance,
            (uniqueName, result) => new CoreSitePluginsQuizAccessRuleHandler(uniqueName, component, !!result.templates.length),
        );
    }

    /**
     * Given a handler in a plugin, register it in the settings delegate.
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param handlerSchema Data about the handler.
     * @param initResult Result of the init WS call.
     * @return A string to identify the handler.
     */
    protected registerSettingsHandler(
        plugin: CoreSitePluginsPlugin,
        handlerName: string,
        handlerSchema: CoreSitePluginsSettingsHandlerData,
        initResult: CoreSitePluginsContent | null,
    ): string | undefined {
        if (!handlerSchema.displaydata) {
            // Required data not provided, stop.
            this.logger.warn('Ignore site plugin because it doesn\'t provide displaydata', plugin, handlerSchema);

            return;
        }

        this.logger.debug('Register site plugin in settings delegate:', plugin, handlerSchema, initResult);

        // Create and register the handler.
        const uniqueName = CoreSitePlugins.getHandlerUniqueName(plugin, handlerName);
        const prefixedTitle = this.getPrefixedString(plugin.addon, handlerSchema.displaydata.title || 'pluginname');

        CoreSettingsDelegate.registerHandler(
            new CoreSitePluginsSettingsHandler(uniqueName, prefixedTitle, plugin, handlerSchema, initResult),
        );

        return uniqueName;
    }

    /**
     * Given a handler in a plugin, register it in the user profile delegate.
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param handlerSchema Data about the handler.
     * @param initResult Result of the init WS call.
     * @return A string to identify the handler.
     */
    protected registerUserProfileHandler(
        plugin: CoreSitePluginsPlugin,
        handlerName: string,
        handlerSchema: CoreSitePluginsUserHandlerData,
        initResult: CoreSitePluginsContent | null,
    ): string | undefined {
        if (!handlerSchema.displaydata) {
            // Required data not provided, stop.
            this.logger.warn('Ignore site plugin because it doesn\'t provide displaydata', plugin, handlerSchema);

            return;
        }

        this.logger.debug('Register site plugin in user profile delegate:', plugin, handlerSchema, initResult);

        // Create and register the handler.
        const uniqueName = CoreSitePlugins.getHandlerUniqueName(plugin, handlerName);
        const prefixedTitle = this.getPrefixedString(plugin.addon, handlerSchema.displaydata.title || 'pluginname');
        const handler = new CoreSitePluginsUserProfileHandler(uniqueName, prefixedTitle, plugin, handlerSchema, initResult);

        CoreUserDelegate.registerHandler(handler);

        if (initResult && initResult.restrict && initResult.restrict.courses) {
            // This handler is restricted to certan courses, store it in the list.
            this.courseRestrictHandlers[uniqueName] = {
                plugin,
                handlerName,
                handlerSchema,
                handler,
            };
        }

        return uniqueName;
    }

    /**
     * Given a handler in a plugin, register it in the user profile field delegate.
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param handlerSchema Data about the handler.
     * @return Promise resolved with a string to identify the handler.
     */
    protected registerUserProfileFieldHandler(
        plugin: CoreSitePluginsPlugin,
        handlerName: string,
        handlerSchema: CoreSitePluginsHandlerCommonData,
    ): Promise<string | undefined> {

        return this.registerComponentInitHandler(
            plugin,
            handlerName,
            handlerSchema,
            CoreUserProfileFieldDelegate.instance,
            (uniqueName) => {
                const fieldType = (handlerSchema.moodlecomponent || plugin.component).replace('profilefield_', '');

                return new CoreSitePluginsUserProfileFieldHandler(uniqueName, fieldType);
            },
        );
    }

    /**
     * Given a handler in a plugin, register it in the workshop assessment strategy delegate.
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param handlerSchema Data about the handler.
     * @return Promise resolved with a string to identify the handler.
     */
    protected registerWorkshopAssessmentStrategyHandler(
        plugin: CoreSitePluginsPlugin,
        handlerName: string,
        handlerSchema: CoreSitePluginsHandlerCommonData,
    ): Promise<string | undefined> {
        return this.registerComponentInitHandler(
            plugin,
            handlerName,
            handlerSchema,
            AddonWorkshopAssessmentStrategyDelegate.instance,
            (uniqueName) => {
                const strategyName = (handlerSchema.moodlecomponent || plugin.component).replace('workshopform_', '');

                return new CoreSitePluginsWorkshopAssessmentStrategyHandler(uniqueName, strategyName);
            },
        );
    }

    /**
     * Reload the handlers that are restricted to certain courses.
     *
     * @return Promise resolved when done.
     */
    protected async reloadCourseRestrictHandlers(): Promise<void> {
        if (!Object.keys(this.courseRestrictHandlers).length) {
            // No course restrict handlers, nothing to do.
            return;
        }

        await Promise.all(Object.keys(this.courseRestrictHandlers).map(async (name) => {
            const data = this.courseRestrictHandlers[name];

            if (!data.handler || !data.handler.setInitResult) {
                // No handler or it doesn't implement a required function, ignore it.
                return;
            }

            // Mark the handler as being updated.
            data.handler.updatingInit && data.handler.updatingInit();

            try {
                const initResult = await this.executeHandlerInit(data.plugin, data.handlerSchema);

                data.handler.setInitResult(initResult);
            } catch (error) {
                this.logger.error('Error reloading course restrict handler', error, data.plugin);
            }
        }));

        CoreEvents.trigger(CoreEvents.SITE_PLUGINS_COURSE_RESTRICT_UPDATED, {});
    }

    /**
     * Given a handler in a plugin, register it in the main menu home delegate.
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param handlerSchema Data about the handler.
     * @param initResult Result of the init WS call.
     * @return A string to identify the handler.
     */
    protected registerMainMenuHomeHandler(
        plugin: CoreSitePluginsPlugin,
        handlerName: string,
        handlerSchema: CoreSitePluginsMainMenuHomeHandlerData,
        initResult: CoreSitePluginsContent | null,
    ): string | undefined {
        if (!handlerSchema.displaydata) {
            // Required data not provided, stop.
            this.logger.warn('Ignore site plugin because it doesn\'t provide displaydata', plugin, handlerSchema);

            return;
        }

        this.logger.debug('Register site plugin in main menu home delegate:', plugin, handlerSchema, initResult);

        // Create and register the handler.
        const uniqueName = CoreSitePlugins.getHandlerUniqueName(plugin, handlerName);
        const prefixedTitle = this.getPrefixedString(plugin.addon, handlerSchema.displaydata.title || 'pluginname');

        CoreMainMenuHomeDelegate.registerHandler(
            new CoreSitePluginsMainMenuHomeHandler(uniqueName, prefixedTitle, plugin, handlerSchema, initResult),
        );

        return uniqueName;
    }

}

export const CoreSitePluginsHelper = makeSingleton(CoreSitePluginsHelperProvider);
