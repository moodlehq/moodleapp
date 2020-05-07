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
import { TranslateService } from '@ngx-translate/core';
import { CoreAppProvider } from '@providers/app';
import { CoreEventsProvider } from '@providers/events';
import { CoreFilepoolProvider } from '@providers/filepool';
import { CoreLangProvider } from '@providers/lang';
import { CoreLoggerProvider } from '@providers/logger';
import { CoreSite } from '@classes/site';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreTextUtilsProvider } from '@providers/utils/text';
import { CoreUrlUtilsProvider } from '@providers/utils/url';
import { CoreUtilsProvider } from '@providers/utils/utils';
import { CoreSitePluginsProvider } from './siteplugins';
import { CoreCompileProvider } from '@core/compile/providers/compile';
import { CoreQuestionProvider } from '@core/question/providers/question';
import { CoreCourseProvider } from '@core/course/providers/course';
import { CoreCoursesProvider } from '@core/courses/providers/courses';
import { CoreFilterHelperProvider } from '@core/filter/providers/helper';
import { CorePluginFileDelegate } from '@providers/plugin-file-delegate';
import { CoreWSProvider } from '@providers/ws';

// Delegates
import { CoreMainMenuDelegate } from '@core/mainmenu/providers/delegate';
import { CoreCourseModuleDelegate } from '@core/course/providers/module-delegate';
import { CoreCourseModulePrefetchDelegate } from '@core/course/providers/module-prefetch-delegate';
import { CoreCourseOptionsDelegate } from '@core/course/providers/options-delegate';
import { CoreCourseFormatDelegate } from '@core/course/providers/format-delegate';
import { CoreUserDelegate } from '@core/user/providers/user-delegate';
import { CoreUserProfileFieldDelegate } from '@core/user/providers/user-profile-field-delegate';
import { CoreSettingsDelegate } from '@core/settings/providers/delegate';
import { CoreQuestionDelegate } from '@core/question/providers/delegate';
import { CoreQuestionBehaviourDelegate } from '@core/question/providers/behaviour-delegate';
import { AddonMessageOutputDelegate } from '@addon/messageoutput/providers/delegate';
import { AddonModQuizAccessRuleDelegate } from '@addon/mod/quiz/providers/access-rules-delegate';
import { AddonModAssignFeedbackDelegate } from '@addon/mod/assign/providers/feedback-delegate';
import { AddonModAssignSubmissionDelegate } from '@addon/mod/assign/providers/submission-delegate';
import { AddonWorkshopAssessmentStrategyDelegate } from '@addon/mod/workshop/providers/assessment-strategy-delegate';

// Handler classes.
import { CoreSitePluginsCourseFormatHandler } from '../classes/handlers/course-format-handler';
import { CoreSitePluginsCourseOptionHandler } from '../classes/handlers/course-option-handler';
import { CoreSitePluginsModuleHandler } from '../classes/handlers/module-handler';
import { CoreSitePluginsModulePrefetchHandler } from '../classes/handlers/module-prefetch-handler';
import { CoreSitePluginsMainMenuHandler } from '../classes/handlers/main-menu-handler';
import { CoreSitePluginsUserProfileHandler } from '../classes/handlers/user-handler';
import { CoreSitePluginsUserProfileFieldHandler } from '../classes/handlers/user-profile-field-handler';
import { CoreSitePluginsSettingsHandler } from '../classes/handlers/settings-handler';
import { CoreSitePluginsQuestionHandler } from '../classes/handlers/question-handler';
import { CoreSitePluginsQuestionBehaviourHandler } from '../classes/handlers/question-behaviour-handler';
import { CoreSitePluginsMessageOutputHandler } from '../classes/handlers/message-output-handler';
import { CoreSitePluginsQuizAccessRuleHandler } from '../classes/handlers/quiz-access-rule-handler';
import { CoreSitePluginsAssignFeedbackHandler } from '../classes/handlers/assign-feedback-handler';
import { CoreSitePluginsAssignSubmissionHandler } from '../classes/handlers/assign-submission-handler';
import { CoreSitePluginsWorkshopAssessmentStrategyHandler } from '../classes/handlers/workshop-assessment-strategy-handler';
import { CoreBlockDelegate } from '@core/block/providers/delegate';
import { CoreSitePluginsBlockHandler } from '@core/siteplugins/classes/handlers/block-handler';

/**
 * Helper service to provide functionalities regarding site plugins. It basically has the features to load and register site
 * plugin.
 *
 * This code is split from CoreSitePluginsProvider to prevent circular dependencies.
 *
 * @todo: Support ViewChild and similar in site plugins. Possible solution: make components and directives inject the instance
 * inside the host DOM element?
 */
@Injectable()
export class CoreSitePluginsHelperProvider {
    protected HANDLER_DISABLED = 'core_site_plugins_helper_handler_disabled';

    protected logger;
    protected courseRestrictHandlers = {};

    constructor(protected loggerProvider: CoreLoggerProvider,
            private sitesProvider: CoreSitesProvider,
            private domUtils: CoreDomUtilsProvider,
            private mainMenuDelegate: CoreMainMenuDelegate,
            private moduleDelegate: CoreCourseModuleDelegate,
            private userDelegate: CoreUserDelegate,
            private langProvider: CoreLangProvider,
            private wsProvider: CoreWSProvider,
            private sitePluginsProvider: CoreSitePluginsProvider,
            private prefetchDelegate: CoreCourseModulePrefetchDelegate,
            private compileProvider: CoreCompileProvider,
            private utils: CoreUtilsProvider,
            private urlUtils: CoreUrlUtilsProvider,
            private courseOptionsDelegate: CoreCourseOptionsDelegate,
            private eventsProvider: CoreEventsProvider,
            private courseFormatDelegate: CoreCourseFormatDelegate,
            private profileFieldDelegate: CoreUserProfileFieldDelegate,
            private textUtils: CoreTextUtilsProvider,
            private filepoolProvider: CoreFilepoolProvider,
            private settingsDelegate: CoreSettingsDelegate,
            private questionDelegate: CoreQuestionDelegate,
            private questionBehaviourDelegate: CoreQuestionBehaviourDelegate,
            private questionProvider: CoreQuestionProvider,
            private messageOutputDelegate: AddonMessageOutputDelegate,
            private accessRulesDelegate: AddonModQuizAccessRuleDelegate,
            private assignSubmissionDelegate: AddonModAssignSubmissionDelegate,
            private translate: TranslateService,
            private assignFeedbackDelegate: AddonModAssignFeedbackDelegate,
            private appProvider: CoreAppProvider,
            private workshopAssessmentStrategyDelegate: AddonWorkshopAssessmentStrategyDelegate,
            private courseProvider: CoreCourseProvider,
            private blockDelegate: CoreBlockDelegate,
            private filterHelper: CoreFilterHelperProvider,
            private pluginFileDelegate: CorePluginFileDelegate) {

        this.logger = loggerProvider.getInstance('CoreSitePluginsHelperProvider');

        // Fetch the plugins on login.
        eventsProvider.on(CoreEventsProvider.LOGIN, (data) => {
            this.fetchSitePlugins(data.siteId).then((plugins) => {
                // Plugins fetched, check that site hasn't changed.
                if (data.siteId == this.sitesProvider.getCurrentSiteId() && plugins.length) {
                    // Site is still the same. Load the plugins and trigger the event.
                    this.loadSitePlugins(plugins).catch((error) => {
                        this.logger.error(error);
                    }).finally(() => {
                        eventsProvider.trigger(CoreEventsProvider.SITE_PLUGINS_LOADED, {}, data.siteId);
                    });
                }
            }).catch((e) => {
                // Ignore errors here.
            }).finally(() => {
                this.sitePluginsProvider.setPluginsFetched();
            });
        });

        // Unload plugins on logout if any.
        eventsProvider.on(CoreEventsProvider.LOGOUT, () => {
            if (this.sitePluginsProvider.hasSitePluginsLoaded) {
                // Temporary fix. Reload the page to unload all plugins.
                window.location.reload();
            }
        });

        // Re-load plugins restricted for courses when the list of user courses changes.
        eventsProvider.on(CoreCoursesProvider.EVENT_MY_COURSES_CHANGED, (data) => {
            if (data && data.siteId && data.siteId == this.sitesProvider.getCurrentSiteId() && data.added && data.added.length) {
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
    downloadStyles(plugin: any, handlerName: string, handlerSchema: any, siteId?: string): Promise<string> {

        return this.sitesProvider.getSite(siteId).then((site) => {
            // Get the absolute URL. If it's a relative URL, add the site URL to it.
            let url = handlerSchema.styles && handlerSchema.styles.url;
            if (url && !this.urlUtils.isAbsoluteURL(url)) {
                url = this.textUtils.concatenatePaths(site.getURL(), url);
            }

            if (url && handlerSchema.styles.version) {
                // Add the version to the URL to prevent getting a cached file.
                url += (url.indexOf('?') != -1 ? '&' : '?') + 'version=' + handlerSchema.styles.version;
            }

            const uniqueName = this.sitePluginsProvider.getHandlerUniqueName(plugin, handlerName),
                componentId = uniqueName + '#main';

            // Remove the CSS files for this handler that aren't used anymore. Don't block the call for this.
            this.filepoolProvider.getFilesByComponent(site.id, CoreSitePluginsProvider.COMPONENT, componentId).then((files) => {
                files.forEach((file) => {
                    if (file.url != url) {
                        // It's not the current file, delete it.
                        this.filepoolProvider.removeFileByUrl(site.id, file.url).catch(() => {
                            // Ignore errors.
                        });
                    }
                });
            }).catch(() => {
                // Ignore errors.
            });

            if (!url) {
                // No styles.
                return '';
            }

            // Download the file if not downloaded or the version changed.
            return this.filepoolProvider.downloadUrl(site.id, url, false, CoreSitePluginsProvider.COMPONENT, componentId, 0,
                   undefined, undefined, undefined, handlerSchema.styles.version).then((url) => {

                // File is downloaded, get the contents.
                return this.wsProvider.getText(url);
            });
        });
    }

    /**
     * Execute a handler's init method if it has any.
     *
     * @param plugin Data of the plugin.
     * @param handlerSchema Data about the handler.
     * @return Promise resolved when done. It returns the results of the getContent call and the data returned by
     *         the init JS (if any).
     */
    protected executeHandlerInit(plugin: any, handlerSchema: any): Promise<any> {
        if (!handlerSchema.init) {
            return Promise.resolve({});
        }

        return this.executeMethodAndJS(plugin, handlerSchema.init, true);
    }

    /**
     * Execute a get_content method and run its javascript (if any).
     *
     * @param plugin Data of the plugin.
     * @param method The method to call.
     * @param isInit Whether it's the init method.
     * @return Promise resolved when done. It returns the results of the getContent call and the data returned by
     *         the JS (if any).
     */
    protected executeMethodAndJS(plugin: any, method: string, isInit?: boolean): Promise<any> {
        const siteId = this.sitesProvider.getCurrentSiteId(),
            preSets = {
                getFromCache: false, // Try to ignore cache.
                deleteCacheIfWSError: isInit // If the init WS call returns an exception we won't use cached data.
            };

        return this.sitePluginsProvider.getContent(plugin.component, method, {}, preSets).then((result) => {
            if (!result.javascript || this.sitesProvider.getCurrentSiteId() != siteId) {
                // No javascript or site has changed, stop.
                return result;
            }

            // Create a "fake" instance to hold all the libraries.
            const instance = {
                HANDLER_DISABLED: this.HANDLER_DISABLED
            };
            this.compileProvider.injectLibraries(instance);

            // Add some data of the WS call result.
            const jsData = this.sitePluginsProvider.createDataForJS(result);
            for (const name in jsData) {
                instance[name] = jsData[name];
            }

            // Now execute the javascript using this instance.
            result.jsResult = this.compileProvider.executeJavascript(instance, result.javascript);

            if (result.jsResult == this.HANDLER_DISABLED) {
                // The "disabled" field was added in 3.8, this is a workaround for previous versions.
                result.disabled = true;
            }

            return result;
        });
    }

    /**
     * Fetch site plugins.
     *
     * @param siteId Site ID. If not defined, current site.
     * @return Promise resolved when done. Returns the list of plugins to load.
     */
    fetchSitePlugins(siteId?: string): Promise<any[]> {
        const plugins = [];

        return this.sitesProvider.getSite(siteId).then((site) => {
            if (!this.sitePluginsProvider.isGetContentAvailable(site)) {
                // Cannot load site plugins, so there's no point to fetch them.
                return plugins;
            }

            // Get the list of plugins. Try not to use cache.
            return site.read('tool_mobile_get_plugins_supporting_mobile', {}, { getFromCache: false }).then((data) => {
                data.plugins.forEach((plugin: any) => {
                    // Check if it's a site plugin and it's enabled.
                    if (this.isSitePluginEnabled(plugin, site)) {
                        plugins.push(plugin);
                    }
                });

                return plugins;
            });
        });
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
     */
    isSitePluginEnabled(plugin: any, site: CoreSite): boolean {
        if (!site.isFeatureDisabled('sitePlugin_' + plugin.component + '_' + plugin.addon) && plugin.handlers) {
            // Site plugin not disabled. Check if it has handlers.
            if (!plugin.parsedHandlers) {
                plugin.parsedHandlers = this.textUtils.parseJSON(plugin.handlers, null,
                    this.logger.error.bind(this.logger, 'Error parsing site plugin handlers'));
            }

            return !!(plugin.parsedHandlers && Object.keys(plugin.parsedHandlers).length);
        }

        return false;
    }

    /**
     * Load the lang strings for a plugin.
     *
     * @param plugin Data of the plugin.
     */
    loadLangStrings(plugin: any): void {
        if (!plugin.parsedLang) {
            return;
        }

        for (const lang in plugin.parsedLang) {
            const prefix = this.getPrefixForStrings(plugin.addon);

            this.langProvider.addSitePluginsStrings(lang, plugin.parsedLang[lang], prefix);
        }
    }

    /**
     * Load a site plugin.
     *
     * @param plugin Data of the plugin.
     * @return Promise resolved when loaded.
     */
    loadSitePlugin(plugin: any): Promise<any> {
        const promises = [];

        this.logger.debug('Load site plugin:', plugin);

        if (!plugin.parsedHandlers) {
            plugin.parsedHandlers = this.textUtils.parseJSON(plugin.handlers, null,
                this.logger.error.bind(this.logger, 'Error parsing site plugin handlers'));
        }
        if (!plugin.parsedLang && plugin.lang) {
            plugin.parsedLang = this.textUtils.parseJSON(plugin.lang, null,
                this.logger.error.bind(this.logger, 'Error parsing site plugin lang'));
        }

        this.sitePluginsProvider.hasSitePluginsLoaded = true;

        // Register lang strings.
        this.loadLangStrings(plugin);

        // Register all the handlers.
        for (const name in plugin.parsedHandlers) {
            promises.push(this.registerHandler(plugin, name, plugin.parsedHandlers[name]));
        }

        return this.utils.allPromises(promises);
    }

    /**
     * Load site plugins.
     *
     * @param plugins The plugins to load.
     * @return Promise resolved when loaded.
     */
    loadSitePlugins(plugins: any[]): Promise<any> {
        const promises = [];
        this.courseRestrictHandlers = {};

        plugins.forEach((plugin) => {
            const pluginPromise = this.loadSitePlugin(plugin);
            promises.push(pluginPromise);
            this.sitePluginsProvider.registerSitePluginPromise(plugin.component, pluginPromise);
        });

        return this.utils.allPromises(promises);
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
    loadStyles(plugin: any, handlerName: string, fileUrl: string, cssCode: string, version?: number, siteId?: string): void {
        siteId = siteId || this.sitesProvider.getCurrentSiteId();

        // Create the style and add it to the header.
        const styleEl = document.createElement('style'),
            uniqueName = this.sitePluginsProvider.getHandlerUniqueName(plugin, handlerName);

        styleEl.setAttribute('id', 'siteplugin-' + uniqueName);
        styleEl.innerHTML = cssCode;

        document.head.appendChild(styleEl);

        // Styles have been loaded, now treat the CSS.
        this.filepoolProvider.treatCSSCode(siteId, fileUrl, cssCode, CoreSitePluginsProvider.COMPONENT, uniqueName, version)
                .catch(() => {
            // Ignore errors.
        });
    }

    /**
     * Register a site plugin handler in the right delegate.
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param handlerSchema Data about the handler.
     * @return Promise resolved when done.
     */
    registerHandler(plugin: any, handlerName: string, handlerSchema: any): Promise<any> {

        // Wait for the init JS to be executed and for the styles to be downloaded.
        const promises = [],
            siteId = this.sitesProvider.getCurrentSiteId();
        let result,
            cssCode;

        promises.push(this.downloadStyles(plugin, handlerName, handlerSchema, siteId).then((code) => {
            cssCode = code;
        }).catch((error) => {
            this.logger.error('Error getting styles for plugin', handlerName, handlerSchema, error);
        }));

        promises.push(this.executeHandlerInit(plugin, handlerSchema).then((initResult) => {
            result = initResult;
        }));

        return Promise.all(promises).then(() => {
            if (result && result.disabled) {
                // This handler is disabled for the current user, stop.
                this.logger.warn('Handler disabled by init function', plugin, handlerSchema);

                return;
            }

            if (cssCode) {
                // Load the styles.
                this.loadStyles(plugin, handlerName, handlerSchema.styles.url, cssCode, handlerSchema.styles.version, siteId);
            }

            let promise;

            switch (handlerSchema.delegate) {
                case 'CoreMainMenuDelegate':
                    promise = Promise.resolve(this.registerMainMenuHandler(plugin, handlerName, handlerSchema, result));
                    break;

                case 'CoreCourseModuleDelegate':
                    promise = Promise.resolve(this.registerModuleHandler(plugin, handlerName, handlerSchema, result));
                    break;

                case 'CoreUserDelegate':
                    promise = Promise.resolve(this.registerUserProfileHandler(plugin, handlerName, handlerSchema, result));
                    break;

                case 'CoreCourseOptionsDelegate':
                    promise = Promise.resolve(this.registerCourseOptionHandler(plugin, handlerName, handlerSchema, result));
                    break;

                case 'CoreCourseFormatDelegate':
                    promise = Promise.resolve(this.registerCourseFormatHandler(plugin, handlerName, handlerSchema));
                    break;

                case 'CoreUserProfileFieldDelegate':
                    promise = Promise.resolve(this.registerUserProfileFieldHandler(plugin, handlerName, handlerSchema));
                    break;

                case 'CoreSettingsDelegate':
                    promise = Promise.resolve(this.registerSettingsHandler(plugin, handlerName, handlerSchema, result));
                    break;

                case 'CoreQuestionDelegate':
                    promise = Promise.resolve(this.registerQuestionHandler(plugin, handlerName, handlerSchema));
                    break;

                case 'CoreQuestionBehaviourDelegate':
                    promise = Promise.resolve(this.registerQuestionBehaviourHandler(plugin, handlerName, handlerSchema));
                    break;

                case 'CoreBlockDelegate':
                    promise = Promise.resolve(this.registerBlockHandler(plugin, handlerName, handlerSchema, result));
                    break;

                case 'AddonMessageOutputDelegate':
                    promise = Promise.resolve(this.registerMessageOutputHandler(plugin, handlerName, handlerSchema, result));
                    break;

                case 'AddonModQuizAccessRuleDelegate':
                    promise = Promise.resolve(this.registerQuizAccessRuleHandler(plugin, handlerName, handlerSchema));
                    break;

                case 'AddonModAssignFeedbackDelegate':
                    promise = Promise.resolve(this.registerAssignFeedbackHandler(plugin, handlerName, handlerSchema));
                    break;

                case 'AddonModAssignSubmissionDelegate':
                    promise = Promise.resolve(this.registerAssignSubmissionHandler(plugin, handlerName, handlerSchema));
                    break;

                case 'AddonWorkshopAssessmentStrategyDelegate':
                    promise = Promise.resolve(this.registerWorkshopAssessmentStrategyHandler(plugin, handlerName, handlerSchema));
                    break;

                default:
                    // Nothing to do.
                    promise = Promise.resolve();
            }

            return promise.then((uniqueName) => {
                if (uniqueName) {
                    // Store the handler data.
                    this.sitePluginsProvider.setSitePluginHandler(uniqueName, {
                        plugin: plugin,
                        handlerName: handlerName,
                        handlerSchema: handlerSchema,
                        initResult: result
                    });
                }
            });
        }).catch((err) => {
            return Promise.reject('Error executing init method ' + handlerSchema.init + ': ' + err.message);
        });
    }

    /**
     * Register a handler that relies in a "componentInit" function in a certain delegate.
     * These type of handlers will return a generic template and its JS in the main method, so it will be called
     * before registering the handler.
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param handlerSchema Data about the handler.
     * @return A string (or a promise resolved with a string) to identify the handler.
     */
    protected registerComponentInitHandler(plugin: any, handlerName: string, handlerSchema: any, delegate: any,
            createHandlerFn: (uniqueName: string, result: any) => any): string | Promise<string> {

        if (!handlerSchema.method) {
            // Required data not provided, stop.
            this.logger.warn('Ignore site plugin because it doesn\'t provide method', plugin, handlerSchema);

            return;
        }

        this.logger.debug('Register site plugin', plugin, handlerSchema);

        // Execute the main method and its JS. The template returned will be used in the right component.
        return this.executeMethodAndJS(plugin, handlerSchema.method).then((result): any => {

            // Create and register the handler.
            const uniqueName = this.sitePluginsProvider.getHandlerUniqueName(plugin, handlerName),
                handler = createHandlerFn(uniqueName, result);

            // Store in handlerSchema some data required by the component.
            handlerSchema.methodTemplates = result.templates;
            handlerSchema.methodJSResult = result.jsResult;
            handlerSchema.methodOtherdata = result.otherdata;

            if (result && result.jsResult) {
                // Override default handler functions with the result of the method JS.
                for (const property in handler) {
                    if (property != 'constructor' && typeof handler[property] == 'function' &&
                            typeof result.jsResult[property] == 'function') {
                        handler[property] = result.jsResult[property].bind(handler);
                    }
                }
            }

            delegate.registerHandler(handler);

            return uniqueName;
        }).catch((err) => {
            this.logger.error('Error executing main method', plugin.component, handlerSchema.method, err);
        });
    }

    /**
     * Given a handler in a plugin, register it in the assign feedback delegate.
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param handlerSchema Data about the handler.
     * @return A string (or a promise resolved with a string) to identify the handler.
     */
    protected registerAssignFeedbackHandler(plugin: any, handlerName: string, handlerSchema: any): string | Promise<string> {

        return this.registerComponentInitHandler(plugin, handlerName, handlerSchema, this.assignFeedbackDelegate,
                    (uniqueName: string, result: any) => {

            const type = (handlerSchema.moodlecomponent || plugin.component).replace('assignfeedback_', ''),
                prefix = this.getPrefixForStrings(plugin.addon);

            return new CoreSitePluginsAssignFeedbackHandler(this.translate, uniqueName, type, prefix);
        });
    }

    /**
     * Given a handler in a plugin, register it in the assign submission delegate.
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param handlerSchema Data about the handler.
     * @return A string (or a promise resolved with a string) to identify the handler.
     */
    protected registerAssignSubmissionHandler(plugin: any, handlerName: string, handlerSchema: any): string | Promise<string> {

        return this.registerComponentInitHandler(plugin, handlerName, handlerSchema, this.assignSubmissionDelegate,
                    (uniqueName: string, result: any) => {

            const type = (handlerSchema.moodlecomponent || plugin.component).replace('assignsubmission_', ''),
                prefix = this.getPrefixForStrings(plugin.addon);

            return new CoreSitePluginsAssignSubmissionHandler(this.translate, uniqueName, type, prefix);
        });
    }

    /**
     * Given a handler in a plugin, register it in the block delegate.
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param handlerSchema Data about the handler.
     * @param initResult Result of init function.
     * @return A string (or a promise resolved with a string) to identify the handler.
     */
    protected registerBlockHandler(plugin: any, handlerName: string, handlerSchema: any, initResult: any):
            string | Promise<string> {

        const uniqueName = this.sitePluginsProvider.getHandlerUniqueName(plugin, handlerName),
            blockName = (handlerSchema.moodlecomponent || plugin.component).replace('block_', ''),
            titleString = (handlerSchema.displaydata && handlerSchema.displaydata.title) ?
                handlerSchema.displaydata.title : 'pluginname',
            prefixedTitle = this.getPrefixedString(plugin.addon, titleString);

        this.blockDelegate.registerHandler(
            new CoreSitePluginsBlockHandler(uniqueName, prefixedTitle, blockName, handlerSchema, initResult, this.blockDelegate));

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
    protected registerCourseFormatHandler(plugin: any, handlerName: string, handlerSchema: any): string {
        this.logger.debug('Register site plugin in course format delegate:', plugin, handlerSchema);

        // Create and register the handler.
        const uniqueName = this.sitePluginsProvider.getHandlerUniqueName(plugin, handlerName),
            formatName = (handlerSchema.moodlecomponent || plugin.component).replace('format_', '');
        this.courseFormatDelegate.registerHandler(new CoreSitePluginsCourseFormatHandler(uniqueName, formatName, handlerSchema));

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
    protected registerCourseOptionHandler(plugin: any, handlerName: string, handlerSchema: any, initResult: any): string {
        if (!handlerSchema.displaydata) {
            // Required data not provided, stop.
            this.logger.warn('Ignore site plugin because it doesn\'t provide displaydata', plugin, handlerSchema);

            return;
        }

        this.logger.debug('Register site plugin in course option delegate:', plugin, handlerSchema, initResult);

        // Create and register the handler.
        const uniqueName = this.sitePluginsProvider.getHandlerUniqueName(plugin, handlerName),
            prefixedTitle = this.getPrefixedString(plugin.addon, handlerSchema.displaydata.title || 'pluginname'),
            handler = new CoreSitePluginsCourseOptionHandler(uniqueName, prefixedTitle, plugin,
                    handlerSchema, initResult, this.sitePluginsProvider, this.utils);

        this.courseOptionsDelegate.registerHandler(handler);

        if (initResult && initResult.restrict && initResult.restrict.courses) {
            // This handler is restricted to certan courses, store it in the list.
            this.courseRestrictHandlers[uniqueName] = {
                plugin: plugin,
                handlerName: handlerName,
                handlerSchema: handlerSchema,
                handler: handler
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
    protected registerMainMenuHandler(plugin: any, handlerName: string, handlerSchema: any, initResult: any): string {
        if (!handlerSchema.displaydata) {
            // Required data not provided, stop.
            this.logger.warn('Ignore site plugin because it doesn\'t provide displaydata', plugin, handlerSchema);

            return;
        }

        this.logger.debug('Register site plugin in main menu delegate:', plugin, handlerSchema, initResult);

        // Create and register the handler.
        const uniqueName = this.sitePluginsProvider.getHandlerUniqueName(plugin, handlerName),
            prefixedTitle = this.getPrefixedString(plugin.addon, handlerSchema.displaydata.title || 'pluginname');

        this.mainMenuDelegate.registerHandler(
                new CoreSitePluginsMainMenuHandler(uniqueName, prefixedTitle, plugin, handlerSchema, initResult));

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
    protected registerMessageOutputHandler(plugin: any, handlerName: string, handlerSchema: any, initResult: any): string {
        if (!handlerSchema.displaydata) {
            // Required data not provided, stop.
            this.logger.warn('Ignore site plugin because it doesn\'t provide displaydata', plugin, handlerSchema);

            return;
        }

        this.logger.debug('Register site plugin in message output delegate:', plugin, handlerSchema, initResult);

        // Create and register the handler.
        const uniqueName = this.sitePluginsProvider.getHandlerUniqueName(plugin, handlerName),
            prefixedTitle = this.getPrefixedString(plugin.addon, handlerSchema.displaydata.title || 'pluginname'),
            processorName = (handlerSchema.moodlecomponent || plugin.component).replace('message_', '');

        this.messageOutputDelegate.registerHandler(new CoreSitePluginsMessageOutputHandler(uniqueName, processorName,
                prefixedTitle, plugin, handlerSchema, initResult));

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
    protected registerModuleHandler(plugin: any, handlerName: string, handlerSchema: any, initResult: any): string {
        if (!handlerSchema.displaydata) {
            // Required data not provided, stop.
            this.logger.warn('Ignore site plugin because it doesn\'t provide displaydata', plugin, handlerSchema);

            return;
        }

        this.logger.debug('Register site plugin in module delegate:', plugin, handlerSchema, initResult);

        // Create and register the handler.
        const uniqueName = this.sitePluginsProvider.getHandlerUniqueName(plugin, handlerName),
            modName = (handlerSchema.moodlecomponent || plugin.component).replace('mod_', '');

        this.moduleDelegate.registerHandler(new CoreSitePluginsModuleHandler(uniqueName, modName, plugin, handlerSchema,
                initResult, this.sitePluginsProvider, this.loggerProvider));

        if (handlerSchema.offlinefunctions && Object.keys(handlerSchema.offlinefunctions).length) {
            // Register the prefetch handler.
            this.prefetchDelegate.registerHandler(new CoreSitePluginsModulePrefetchHandler(this.translate, this.appProvider,
                this.utils, this.courseProvider, this.filepoolProvider, this.sitesProvider, this.domUtils, this.filterHelper,
                this.pluginFileDelegate, this.sitePluginsProvider, plugin.component, uniqueName, modName, handlerSchema));
        }

        return uniqueName;
    }

    /**
     * Given a handler in a plugin, register it in the question delegate.
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param handlerSchema Data about the handler.
     * @return A string (or a promise resolved with a string) to identify the handler.
     */
    protected registerQuestionHandler(plugin: any, handlerName: string, handlerSchema: any): string | Promise<string> {

        return this.registerComponentInitHandler(plugin, handlerName, handlerSchema, this.questionDelegate,
                    (uniqueName: string, result: any) => {

            return new CoreSitePluginsQuestionHandler(uniqueName, handlerSchema.moodlecomponent || plugin.component);
        });
    }

    /**
     * Given a handler in a plugin, register it in the question behaviour delegate.
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param handlerSchema Data about the handler.
     * @return A string (or a promise resolved with a string) to identify the handler.
     */
    protected registerQuestionBehaviourHandler(plugin: any, handlerName: string, handlerSchema: any): string | Promise<string> {

        return this.registerComponentInitHandler(plugin, handlerName, handlerSchema, this.questionBehaviourDelegate,
                    (uniqueName: string, result: any) => {

            const type = (handlerSchema.moodlecomponent || plugin.component).replace('qbehaviour_', '');

            return new CoreSitePluginsQuestionBehaviourHandler(this.questionProvider, uniqueName, type, result.templates.length);
        });
    }

    /**
     * Given a handler in a plugin, register it in the quiz access rule delegate.
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param handlerSchema Data about the handler.
     * @return A string (or a promise resolved with a string) to identify the handler.
     */
    protected registerQuizAccessRuleHandler(plugin: any, handlerName: string, handlerSchema: any): string | Promise<string> {

        return this.registerComponentInitHandler(plugin, handlerName, handlerSchema, this.accessRulesDelegate,
                    (uniqueName: string, result: any) => {

            return new CoreSitePluginsQuizAccessRuleHandler(uniqueName, handlerSchema.moodlecomponent || plugin.component,
                    result.templates.length);
        });
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
    protected registerSettingsHandler(plugin: any, handlerName: string, handlerSchema: any, initResult: any): string {
        if (!handlerSchema.displaydata) {
            // Required data not provided, stop.
            this.logger.warn('Ignore site plugin because it doesn\'t provide displaydata', plugin, handlerSchema);

            return;
        }

        this.logger.debug('Register site plugin in settings delegate:', plugin, handlerSchema, initResult);

        // Create and register the handler.
        const uniqueName = this.sitePluginsProvider.getHandlerUniqueName(plugin, handlerName),
            prefixedTitle = this.getPrefixedString(plugin.addon, handlerSchema.displaydata.title || 'pluginname');

        this.settingsDelegate.registerHandler(
                new CoreSitePluginsSettingsHandler(uniqueName, prefixedTitle, plugin, handlerSchema, initResult));

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
    protected registerUserProfileHandler(plugin: any, handlerName: string, handlerSchema: any, initResult: any): string {
        if (!handlerSchema.displaydata) {
            // Required data not provided, stop.
            this.logger.warn('Ignore site plugin because it doesn\'t provide displaydata', plugin, handlerSchema);

            return;
        }

        this.logger.debug('Register site plugin in user profile delegate:', plugin, handlerSchema, initResult);

        // Create and register the handler.
        const uniqueName = this.sitePluginsProvider.getHandlerUniqueName(plugin, handlerName),
            prefixedTitle = this.getPrefixedString(plugin.addon, handlerSchema.displaydata.title || 'pluginname'),
            handler = new CoreSitePluginsUserProfileHandler(uniqueName, prefixedTitle, plugin, handlerSchema,
                    initResult, this.sitePluginsProvider, this.utils);

        this.userDelegate.registerHandler(handler);

        if (initResult && initResult.restrict && initResult.restrict.courses) {
            // This handler is restricted to certan courses, store it in the list.
            this.courseRestrictHandlers[uniqueName] = {
                plugin: plugin,
                handlerName: handlerName,
                handlerSchema: handlerSchema,
                handler: handler
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
     * @return A string (or a promise resolved with a string) to identify the handler.
     */
    protected registerUserProfileFieldHandler(plugin: any, handlerName: string, handlerSchema: any): string | Promise<string> {

        return this.registerComponentInitHandler(plugin, handlerName, handlerSchema, this.profileFieldDelegate,
                    (uniqueName: string, result: any) => {

            const fieldType = (handlerSchema.moodlecomponent || plugin.component).replace('profilefield_', '');

            return new CoreSitePluginsUserProfileFieldHandler(uniqueName, fieldType);
        });
    }

    /**
     * Given a handler in a plugin, register it in the workshop assessment strategy delegate.
     *
     * @param plugin Data of the plugin.
     * @param handlerName Name of the handler in the plugin.
     * @param handlerSchema Data about the handler.
     * @return A string (or a promise resolved with a string) to identify the handler.
     */
    protected registerWorkshopAssessmentStrategyHandler(plugin: any, handlerName: string, handlerSchema: any)
            : string | Promise<string> {

        return this.registerComponentInitHandler(plugin, handlerName, handlerSchema, this.workshopAssessmentStrategyDelegate,
                    (uniqueName: string, result: any) => {

            const strategyName = (handlerSchema.moodlecomponent || plugin.component).replace('workshopform_', '');

            return new CoreSitePluginsWorkshopAssessmentStrategyHandler(uniqueName, strategyName);
        });
    }

    /**
     * Reload the handlers that are restricted to certain courses.
     *
     * @return Promise resolved when done.
     */
    protected reloadCourseRestrictHandlers(): Promise<any> {
        if (!Object.keys(this.courseRestrictHandlers).length) {
            // No course restrict handlers, nothing to do.
            return Promise.resolve();
        }

        const promises = [];

        for (const name in this.courseRestrictHandlers) {
            const data = this.courseRestrictHandlers[name];

            if (!data.handler || !data.handler.setInitResult) {
                // No handler or it doesn't implement a required function, ignore it.
                continue;
            }

            // Mark the handler as being updated.
            data.handler.updatingInit && data.handler.updatingInit();

            promises.push(this.executeHandlerInit(data.plugin, data.handlerSchema).then((initResult) => {
                data.handler.setInitResult(initResult);
            }).catch((error) => {
                this.logger.error('Error reloading course restrict handler', error, data.plugin);
            }));
        }

        return Promise.all(promises).then(() => {
            this.eventsProvider.trigger(CoreEventsProvider.SITE_PLUGINS_COURSE_RESTRICT_UPDATED, {});
        });
    }
}
