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
import { CoreSiteWSPreSets } from '@classes/sites/authenticated-site';
import { CoreBlockDelegate } from '@features/block/services/block-delegate';
import { CoreCompile } from '@features/compile/services/compile';
import { CoreCourseOptionsDelegate } from '@features/course/services/course-options-delegate';
import { CoreCourseFormatDelegate } from '@features/course/services/format-delegate';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@features/course/services/module-prefetch-delegate';
import { CoreMainMenuDelegate } from '@features/mainmenu/services/mainmenu-delegate';
import { CoreQuestionBehaviourDelegate } from '@features/question/services/behaviour-delegate';
import { CoreQuestionDelegate } from '@features/question/services/question-delegate';
import { CoreSettingsDelegate } from '@features/settings/services/settings-delegate';
import { CoreUserDelegate } from '@features/user/services/user-delegate';
import { CoreUserProfileFieldDelegate } from '@features/user/services/user-profile-field-delegate';
import { CoreFilepool } from '@services/filepool';
import { CoreLang } from '@services/lang';
import { CoreSites } from '@services/sites';
import { CoreText } from '@singletons/text';
import { CorePromiseUtils } from '@singletons/promise-utils';
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
    CoreSitePluginsEnrolHandlerData,
} from './siteplugins';
import { makeSingleton } from '@singletons';
import { CoreMainMenuHomeDelegate } from '@features/mainmenu/services/home-delegate';
import { CoreSitePluginsMainMenuHomeHandler } from '../classes/handlers/main-menu-home-handler';
import { AddonWorkshopAssessmentStrategyDelegate } from '@addons/mod/workshop/services/assessment-strategy-delegate';
import { CoreSitePluginsWorkshopAssessmentStrategyHandler } from '../classes/handlers/workshop-assessment-strategy-handler';
import { CoreContentLinksModuleIndexHandler } from '@features/contentlinks/classes/module-index-handler';
import { CoreContentLinksDelegate } from '@features/contentlinks/services/contentlinks-delegate';
import { CoreContentLinksModuleListHandler } from '@features/contentlinks/classes/module-list-handler';
import { CoreObject } from '@singletons/object';
import { CoreUrl } from '@singletons/url';
import { CorePath } from '@singletons/path';
import { CoreEnrolAction, CoreEnrolDelegate } from '@features/enrol/services/enrol-delegate';
import { CoreSitePluginsEnrolHandler } from '../classes/handlers/enrol-handler';
import { CORE_SITE_PLUGINS_COMPONENT } from '../constants';
import { CORE_COURSES_MY_COURSES_CHANGED_EVENT } from '@features/courses/constants';
import { CorePromisedValue } from '@classes/promised-value';

/**
 * Helper service to provide functionalities regarding site plugins. It basically has the features to load and register site
 * plugin.
 *
 * This code is split from CoreSitePluginsProvider to prevent circular dependencies.
 *
 * @todo Support ViewChild and similar in site plugins. Possible solution: make components and directives inject the instance
 * inside the host DOM element?
 */
@Injectable({ providedIn: 'root' })
export class CoreSitePluginsInitService {

    protected logger = CoreLogger.getInstance('CoreSitePluginsInit');
    protected courseRestrictHandlers: Record<string, {
        plugin: CoreSitePluginsPlugin;
        handlerName: string;
        handlerSchema: CoreSitePluginsCourseOptionHandlerData | CoreSitePluginsUserHandlerData;
        handler: CoreSitePluginsCourseOptionHandler | CoreSitePluginsUserProfileHandler;
    }> = {};

    protected static readonly HANDLER_DISABLED = 'core_site_plugins_helper_handler_disabled';

    /**
     * Initialize.
     */
    init(): void {
        // Fetch the plugins on login.
        CoreEvents.on(CoreEvents.LOGIN, async (data) => {
            try {
                const plugins = await CorePromiseUtils.ignoreErrors(CoreSitePlugins.getPlugins(data.siteId));

                // Plugins fetched, check that site hasn't changed.
                if (data.siteId !== CoreSites.getCurrentSiteId() || !plugins?.length) {
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
        CoreEvents.on(CORE_COURSES_MY_COURSES_CHANGED_EVENT, (data) => {
            if (data.siteId && data.siteId === CoreSites.getCurrentSiteId() && data.added.length) {
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
     */
    protected async downloadStyles(
        plugin: CoreSitePluginsPlugin,
        handlerName: string,
        handlerSchema: CoreSitePluginsHandlerData,
        siteId: string,
    ): Promise<void> {
        try {
            if (handlerSchema.styles?.downloadedStyles) {
                return;
            }

            if (url && handlerSchema.styles?.version) {
                // Add the version to the URL to prevent getting a cached file.
                url += `${url.indexOf('?') != -1 ? '&' : '?'}version=${handlerSchema.styles.version}`;
            }

            const uniqueName = CoreSitePlugins.getHandlerUniqueName(plugin, handlerName);
            const componentId = `${uniqueName}#main`;

            if (!handlerSchema.styles?.url) {
                // No styles. Clear previous styles if any.
                await this.clearPreviousStyles(componentId, siteId);

                if (handlerSchema.styles) {
                    handlerSchema.styles = undefined;
                }

                return;
            }

            const site = await CoreSites.getSite(siteId);
            siteId = site.getId();

            // Make sure it's an absolute URL. Do not use toAbsoluteURL because it can change the behaviour and break plugin styles.
            let fileUrl = handlerSchema.styles.url;
            const version = handlerSchema.styles.version;

            if (!CoreUrl.isAbsoluteURL(fileUrl)) {
                fileUrl = CorePath.concatenatePaths(site.getURL(), fileUrl);
            }

            if (version) {
                // Add the version to the URL to prevent getting a cached file.
                fileUrl = CoreUrl.addParamsToUrl(fileUrl, { version });
            }

            await this.clearPreviousStyles(componentId, siteId, fileUrl);

            handlerSchema.styles.downloadedStyles = new CorePromisedValue<string>();
            // Download the file if not downloaded or the version changed.
            const path = await CoreFilepool.downloadUrl(
                siteId,
                fileUrl,
                false,
                CORE_SITE_PLUGINS_COMPONENT,
                componentId,
                0,
                undefined,
                undefined,
                undefined,
                handlerSchema.styles.version,
            );

            const cssCode = await CoreWS.getText(path);

            await CorePromiseUtils.ignoreErrors(
                CoreFilepool.treatCSSCode(siteId, fileUrl, cssCode, CORE_SITE_PLUGINS_COMPONENT, uniqueName, version),
            );

            handlerSchema.styles.downloadedStyles.resolve(path);
        } catch (error) {
            this.logger.error('Error getting styles for plugin', handlerName, handlerSchema, error);

            if (handlerSchema.styles?.downloadedStyles) {
                handlerSchema.styles.downloadedStyles.reject(error);
            }
        }
    }

    /**
     * Clear previous styles for a handler.
     * This function will remove all the CSS files for the handler that aren't used anymore.
     *
     * @param componentId Component ID.
     * @param siteId Site ID.
     * @param url URL of the current CSS file. If not provided, all the CSS files for the handler will be removed.
     */
    protected async clearPreviousStyles(
        componentId: string,
        siteId: string,
        url?: string,
    ): Promise<void> {
        // Remove the CSS files for this handler that aren't used anymore. Don't block the call for this.
        const files = await CorePromiseUtils.ignoreErrors(
            CoreFilepool.getFilesByComponent(siteId, CORE_SITE_PLUGINS_COMPONENT, componentId),
        );

        files?.forEach((file) => {
            if (file.url !== url) {
                // It's not the current file, delete it.
                CorePromiseUtils.ignoreErrors(CoreFilepool.removeFileByUrl(siteId, file.url));
            }
        });
    }

    /**
     * Execute a handler's init method if it has any.
     *
     * @param plugin Data of the plugin.
     * @param handlerSchema Data about the handler.
     * @returns Promise resolved when done. It returns the results of the getContent call and the data returned by
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
     * @returns Promise resolved with the results of the getContent call and the data returned by the JS (if any).
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
            HANDLER_DISABLED: CoreSitePluginsInitService.HANDLER_DISABLED,
        };

        await CoreCompile.loadLibraries();
        CoreCompile.injectLibraries(instance);

        // Add some data of the WS call result.
        const jsData = CoreSitePlugins.createDataForJS(result);
        for (const name in jsData) {
            instance[name] = jsData[name];
        }

        // Now execute the javascript using this instance.
        result.jsResult = CoreCompile.executeJavascript(instance, result.javascript);

        if (result.jsResult === CoreSitePluginsInitService.HANDLER_DISABLED) {
            // The "disabled" field was added in 3.8, this is a workaround for previous versions.
            result.disabled = true;
        }

        return result;
    }

    /**
     * Given an addon name, return the prefix to add to its string keys.
     *
     * @param addon Name of the addon (plugin.addon).
     * @returns Prefix.
     */
    protected getPrefixForStrings(addon: string): string {
        if (addon) {
            return `plugin.${addon}.`;
        }

        return '';
    }

    /**
     * Given an addon name and the key of a string, return the full string key (prefixed).
     *
     * @param addon Name of the addon (plugin.addon).
     * @param key The key of the string. Defaults to pluginname.
     * @returns Full string key.
     */
    protected getPrefixedString(addon: string, key = 'pluginname'): string {
        return this.getPrefixForStrings(addon) + key;
    }

    /**
     * Load the lang strings for a plugin.
     *
     * @param plugin Data of the plugin.
     */
    protected loadLangStrings(plugin: CoreSitePluginsPlugin): void {
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
     */
    protected async loadSitePlugin(plugin: CoreSitePluginsPlugin): Promise<void> {
        this.logger.debug('Load site plugin:', plugin);

        if (!plugin.parsedHandlers && plugin.handlers) {
            plugin.parsedHandlers = CoreText.parseJSON(
                plugin.handlers,
                null,
                error => this.logger.error('Error parsing site plugin handlers', error),
            );
        }

        if (!plugin.parsedLang && plugin.lang) {
            plugin.parsedLang = CoreText.parseJSON(
                plugin.lang,
                null,
                error => this.logger.error('Error parsing site plugin lang', error),
            );
        }

        CoreSitePlugins.setPluginsLoaded(true);

        // Register lang strings.
        this.loadLangStrings(plugin);

        if (plugin.parsedHandlers) {
            // Register all the handlers.
            const parsedHandlers = plugin.parsedHandlers;
            await CorePromiseUtils.allPromises(Object.keys(parsedHandlers).map(async (name) => {
                await this.registerHandler(plugin, name, parsedHandlers[name]);
            }));
        }
    }

    /**
     * Load site plugins.
     *
     * @param plugins The plugins to load.
     */
    protected async loadSitePlugins(plugins: CoreSitePluginsPlugin[]): Promise<void> {
        this.courseRestrictHandlers = {};

        await CorePromiseUtils.allPromises(plugins.map(async (plugin) => {
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
     * @param handlerSchema Data about the handler.
     * @param siteId Site ID. If not provided, current site.
     */
    protected async loadStyles(
        plugin: CoreSitePluginsPlugin,
        handlerName: string,
        handlerSchema: CoreSitePluginsHandlerData,
        siteId?: string,
    ): Promise<void> {
        siteId = siteId || CoreSites.getCurrentSiteId();

        this.downloadStyles(plugin, handlerName, handlerSchema, siteId);

        const path = await CoreSitePlugins.getHandlerDownloadedStyles(handlerName);
        if (!path || !handlerSchema.styles?.url) {
            return;
        }
        const fileUrl = handlerSchema.styles.url;
        const version = handlerSchema.styles.version;

        const cssCode = await CoreWS.getText(path);

        // Create the style and add it to the header.
        const styleEl = document.createElement('style');
        const uniqueName = CoreSitePlugins.getHandlerUniqueName(plugin, handlerName);

        styleEl.setAttribute('id', `siteplugin-${uniqueName}`);
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
        CorePromiseUtils.ignoreErrors(
            CoreFilepool.treatCSSCode(siteId, fileUrl, cssCode, CORE_SITE_PLUGINS_COMPONENT, uniqueName, version),
        );
    }

    /**
     * Register a site plugin handler in the right delegate.
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param handlerSchema Data about the handler.
     */
    protected async registerHandler(
        plugin: CoreSitePluginsPlugin,
        handlerName: string,
        handlerSchema: CoreSitePluginsHandlerData,
    ): Promise<void> {
        // Wait for the init JS to be executed and for the styles to be downloaded.
        const siteId = CoreSites.getCurrentSiteId();

        try {
            const initResult = await this.executeHandlerInit(plugin, handlerSchema);

            if (initResult?.disabled) {
                // This handler is disabled for the current user, stop.
                this.logger.warn('Handler disabled by init function', plugin, handlerSchema);

                return;
            }

            let loadStyles = true;

            let uniqueName: string | undefined;

            switch (handlerSchema.delegate) {
                case 'CoreMainMenuDelegate':
                    uniqueName = this.registerMainMenuHandler(plugin, handlerName, handlerSchema, initResult);
                    break;

                case 'CoreCourseModuleDelegate':
                    uniqueName = this.registerModuleHandler(plugin, handlerName, handlerSchema, initResult);
                    break;

                case 'CoreUserDelegate':
                    uniqueName = this.registerUserProfileHandler(plugin, handlerName, handlerSchema, initResult);
                    break;

                case 'CoreCourseOptionsDelegate':
                    uniqueName = this.registerCourseOptionHandler(plugin, handlerName, handlerSchema, initResult);
                    break;

                case 'CoreCourseFormatDelegate':
                    uniqueName = this.registerCourseFormatHandler(plugin, handlerName, handlerSchema);
                    break;

                case 'CoreUserProfileFieldDelegate':
                    uniqueName = await this.registerUserProfileFieldHandler(plugin, handlerName, handlerSchema);
                    break;

                case 'CoreSettingsDelegate':
                    uniqueName = this.registerSettingsHandler(plugin, handlerName, handlerSchema, initResult);
                    break;

                case 'CoreQuestionDelegate':
                    uniqueName = await this.registerQuestionHandler(plugin, handlerName, handlerSchema);
                    break;

                case 'CoreQuestionBehaviourDelegate':
                    uniqueName = await this.registerQuestionBehaviourHandler(plugin, handlerName, handlerSchema);
                    break;

                case 'CoreBlockDelegate':
                    uniqueName = this.registerBlockHandler(plugin, handlerName, handlerSchema, initResult);
                    break;

                case 'AddonMessageOutputDelegate':
                    uniqueName = this.registerMessageOutputHandler(plugin, handlerName, handlerSchema, initResult);
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
                    uniqueName = this.registerMainMenuHomeHandler(plugin, handlerName, handlerSchema, initResult);
                    break;

                case 'CoreEnrolDelegate':
                    uniqueName = await this.registerEnrolHandler(plugin, handlerName, handlerSchema, initResult);
                    break;

                default:
                    loadStyles = false;
                    // Nothing to do.
                    this.loadStyles(plugin, handlerName, handlerSchema, siteId);
            }

            if (loadStyles) {
                // Load the styles without waiting for them to be downloaded.
                this.downloadStyles(plugin, handlerName, handlerSchema, siteId);
            } else {
                handlerSchema.styles = undefined;
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
            throw new CoreError(`Error executing init method ${handlerSchema.init}: ${error.message}`);
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
     * @returns A promise resolved with a string to identify the handler.
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
                const handlerProperties = CoreObject.getAllPropertyNames(handler);

                for (const property of handlerProperties) {
                    if (property !== 'constructor' && typeof handler[property] === 'function' &&
                            typeof jsResult[property] === 'function') {
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
     * @returns Promise resolved with a string to identify the handler.
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
     * @returns Promise resolved with a string to identify the handler.
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
     * @returns A string to identify the handler.
     */
    protected registerBlockHandler(
        plugin: CoreSitePluginsPlugin,
        handlerName: string,
        handlerSchema: CoreSitePluginsBlockHandlerData,
        initResult: CoreSitePluginsContent | null,
    ): string | undefined {

        const uniqueName = CoreSitePlugins.getHandlerUniqueName(plugin, handlerName);
        const blockName = (handlerSchema.moodlecomponent || plugin.component).replace('block_', '');
        const titleString = handlerSchema.displaydata?.title;
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
     * @returns A string to identify the handler.
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
     * @returns A string to identify the handler.
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
        const prefixedTitle = this.getPrefixedString(plugin.addon, handlerSchema.displaydata.title);
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
     * Given a handler in a plugin, register it in the enrol delegate.
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param handlerSchema Data about the handler.
     * @param initResult Result of init function.
     * @returns A string to identify the handler.
     */
    protected async registerEnrolHandler(
        plugin: CoreSitePluginsPlugin,
        handlerName: string,
        handlerSchema: CoreSitePluginsEnrolHandlerData,
        initResult: CoreSitePluginsContent | null,
    ): Promise<string | undefined> {
        const uniqueName = CoreSitePlugins.getHandlerUniqueName(plugin, handlerName);
        const type = (handlerSchema.moodlecomponent || plugin.component).replace('enrol_', '');
        const action = handlerSchema.enrolmentAction ?? CoreEnrolAction.BROWSER;
        const handler = new CoreSitePluginsEnrolHandler(uniqueName, type, action, handlerSchema, initResult);

        if (!handlerSchema.method && (action === CoreEnrolAction.SELF || action === CoreEnrolAction.GUEST)) {
            this.logger.error('"self" or "guest" enrol plugins must implement a method to override the required JS functions.');

            return;
        }

        if (handlerSchema.method) {
            // Execute the main method and its JS to allow implementing the handler functions.
            const result = await this.executeMethodAndJS(plugin, handlerSchema.method);

            if (action === CoreEnrolAction.SELF && !result.jsResult?.enrol) {
                this.logger.error('"self" enrol plugins must implement an "enrol" function in the JS returned by the method.');

                return;
            }

            if (action === CoreEnrolAction.GUEST && (!result.jsResult?.canAccess || !result.jsResult?.validateAccess)) {
                this.logger.error('"guest" enrol plugins must implement "canAccess" and "validateAccess" functions in the JS ' +
                    'returned by the method.');

                return;
            }

            if (result.jsResult) {
                // Override default handler functions with the result of the method JS.
                const jsResult = <Record<string, unknown>> result.jsResult;
                const handlerProperties = CoreObject.getAllPropertyNames(handler);

                for (const property of handlerProperties) {
                    if (property !== 'constructor' && typeof handler[property] === 'function' &&
                            typeof jsResult[property] === 'function') {
                        handler[property] = (<Function> jsResult[property]).bind(handler);
                    }
                }
            }
        }

        CoreEnrolDelegate.registerHandler(handler);

        return uniqueName;
    }

    /**
     * Given a handler in a plugin, register it in the main menu delegate.
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param handlerSchema Data about the handler.
     * @param initResult Result of the init WS call.
     * @returns A string to identify the handler.
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
        const prefixedTitle = this.getPrefixedString(plugin.addon, handlerSchema.displaydata.title);

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
     * @returns A string to identify the handler.
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
        const prefixedTitle = this.getPrefixedString(plugin.addon, handlerSchema.displaydata.title);
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
     * @returns A string to identify the handler.
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

        const moduleHandler = new CoreSitePluginsModuleHandler(uniqueName, modName, plugin, handlerSchema, initResult);
        CoreCourseModuleDelegate.registerHandler(moduleHandler);
        CoreSitePlugins.setModuleHandlerInstance(modName, moduleHandler);

        if (handlerSchema.offlinefunctions && Object.keys(handlerSchema.offlinefunctions).length) {
            // Register the prefetch handler.
            CoreCourseModulePrefetchDelegate.registerHandler(
                new CoreSitePluginsModulePrefetchHandler(plugin.component, uniqueName, modName, handlerSchema),
            );
        }

        // Create default link handlers if needed.
        if (!moduleHandler.supportsNoViewLink() && handlerSchema.method && !handlerSchema.nolinkhandlers) {
            const indexLinkHandler = new CoreContentLinksModuleIndexHandler(uniqueName, modName);
            indexLinkHandler.name = `${uniqueName}_indexlink`;
            indexLinkHandler.priority = -1; // Use -1 to give more priority to the plugins link handlers if any.
            CoreContentLinksDelegate.registerHandler(indexLinkHandler);

            const listLinkHandler = new CoreContentLinksModuleListHandler(uniqueName, modName);
            listLinkHandler.name = `${uniqueName}_listlink`;
            listLinkHandler.priority = -1; // Use -1 to give more priority to the plugins link handlers if any.
            CoreContentLinksDelegate.registerHandler(listLinkHandler);
        }

        return uniqueName;
    }

    /**
     * Given a handler in a plugin, register it in the question delegate.
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param handlerSchema Data about the handler.
     * @returns Promise resolved with a string to identify the handler.
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
     * @returns Promise resolved with a string to identify the handler.
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
     * @returns Promise resolved with a string to identify the handler.
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
     * @returns A string to identify the handler.
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
        const prefixedTitle = this.getPrefixedString(plugin.addon, handlerSchema.displaydata.title);

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
     * @returns A string to identify the handler.
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
        const prefixedTitle = this.getPrefixedString(plugin.addon, handlerSchema.displaydata.title);
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
     * @returns Promise resolved with a string to identify the handler.
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
     * @returns Promise resolved with a string to identify the handler.
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
     * @returns A string to identify the handler.
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
        const prefixedTitle = this.getPrefixedString(plugin.addon, handlerSchema.displaydata.title);

        CoreMainMenuHomeDelegate.registerHandler(
            new CoreSitePluginsMainMenuHomeHandler(uniqueName, prefixedTitle, plugin, handlerSchema, initResult),
        );

        return uniqueName;
    }

}

export const CoreSitePluginsInit = makeSingleton(CoreSitePluginsInitService);
