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

import { CoreLoggerProvider } from '@providers/logger';
import { CoreSitesProvider } from '@providers/sites';
import { CoreEventsProvider } from '@providers/events';
import { CoreSite } from '@classes/site';

export interface CoreDelegateHandler {
    /**
     * Name of the handler, or name and sub context (AddonMessages, AddonMessages:blockContact, ...).
     * This name will be used to check if the feature is disabled.
     */
    name: string;

    /**
     * Whether or not the handler is enabled on a site level.
     * @return Whether or not the handler is enabled on a site level.
     */
    isEnabled(): boolean | Promise<boolean>;
}

/**
 * Superclass to help creating delegates
 */
export class CoreDelegate {

    /**
     * Logger instance get from CoreLoggerProvider.
     */
    protected logger;

    /**
     * List of registered handlers.
     */
    protected handlers: { [s: string]: CoreDelegateHandler } = {};

    /**
     * List of registered handlers enabled for the current site.
     */
    protected enabledHandlers: { [s: string]: CoreDelegateHandler } = {};

    /**
     * Default handler
     */
    protected defaultHandler: CoreDelegateHandler;

    /**
     * Time when last updateHandler functions started.
     */
    protected lastUpdateHandlersStart: number;

    /**
     * Feature prefix to check is feature is enabled or disabled in site.
     * This check is only made if not false. Override on the subclass or override isFeatureDisabled function.
     */
    protected featurePrefix: string;

    /**
     * Name of the property to be used to index the handlers. By default, the handler's name will be used.
     * If your delegate uses a Moodle component name to identify the handlers, please override this property.
     * E.g. CoreCourseModuleDelegate uses 'modName' to index the handlers.
     */
    protected handlerNameProperty = 'name';

    /**
     * Set of promises to update a handler, to prevent doing the same operation twice.
     */
    protected updatePromises: {[siteId: string]: {[name: string]: Promise<any>}} = {};

    /**
     * Whether handlers have been initialized.
     */
    protected handlersInitialized = false;

    /**
     * Promise to wait for handlers to be initialized.
     */
    protected handlersInitPromise: Promise<any>;

    /**
     * Function to resolve the handlers init promise.
     */
    protected handlersInitResolve: (value?: any) => void;

    /**
     * Constructor of the Delegate.
     *
     * @param delegateName Delegate name used for logging purposes.
     * @param loggerProvider CoreLoggerProvider instance, cannot be directly injected.
     * @param sitesProvider CoreSitesProvider instance, cannot be directly injected.
     * @param eventsProvider CoreEventsProvider instance, cannot be directly injected.
     *                       If not set, no events will be fired.
     */
    constructor(delegateName: string, protected loggerProvider: CoreLoggerProvider, protected sitesProvider: CoreSitesProvider,
            protected eventsProvider?: CoreEventsProvider) {
        this.logger = this.loggerProvider.getInstance(delegateName);

        this.handlersInitPromise = new Promise((resolve): void => {
            this.handlersInitResolve = resolve;
        });

        if (eventsProvider) {
            // Update handlers on this cases.
            eventsProvider.on(CoreEventsProvider.LOGIN, this.updateHandlers.bind(this));
            eventsProvider.on(CoreEventsProvider.SITE_UPDATED, this.updateHandlers.bind(this));
            eventsProvider.on(CoreEventsProvider.SITE_PLUGINS_LOADED, this.updateHandlers.bind(this));
        }
    }

    /**
     * Execute a certain function in a enabled handler.
     * If the handler isn't found or function isn't defined, call the same function in the default handler.
     *
     * @param handlerName The handler name.
     * @param fnName Name of the function to execute.
     * @param params Parameters to pass to the function.
     * @return Function returned value or default value.
     */
    protected executeFunctionOnEnabled(handlerName: string, fnName: string, params?: any[]): any {
        return this.execute(this.enabledHandlers[handlerName], fnName, params);
    }

    /**
     * Execute a certain function in a handler.
     * If the handler isn't found or function isn't defined, call the same function in the default handler.
     *
     * @param handlerName The handler name.
     * @param fnName Name of the function to execute.
     * @param params Parameters to pass to the function.
     * @return Function returned value or default value.
     */
    protected executeFunction(handlerName: string, fnName: string, params?: any[]): any {
        return this.execute(this.handlers[handlerName], fnName, params);
    }

    /**
     * Execute a certain function in a handler.
     * If the handler isn't found or function isn't defined, call the same function in the default handler.
     *
     * @param handler The handler.
     * @param fnName Name of the function to execute.
     * @param params Parameters to pass to the function.
     * @return Function returned value or default value.
     */
    private execute(handler: any, fnName: string, params?: any[]): any {
        if (handler && handler[fnName]) {
            return handler[fnName].apply(handler, params);
        } else if (this.defaultHandler && this.defaultHandler[fnName]) {
            return this.defaultHandler[fnName].apply(this.defaultHandler, params);
        }
    }

    /**
     * Get a handler.
     *
     * @param handlerName The handler name.
     * @param enabled Only enabled, or any.
     * @return Handler.
     */
    protected getHandler(handlerName: string, enabled: boolean = false): CoreDelegateHandler {
        return enabled ? this.enabledHandlers[handlerName] : this.handlers[handlerName];
    }

    /**
     * Gets the handler full name for a given name. This is useful when the handlerNameProperty is different than "name".
     * E.g. blocks are indexed by blockName. If you call this function passing the blockName it will return the name.
     *
     * @param name Name used to indentify the handler.
     * @return Full name of corresponding handler.
     */
    getHandlerName(name: string): string {
        const handler = this.getHandler(name, true);

        if (!handler) {
            return '';
        }

        return handler.name;
    }

    /**
     * Check if function exists on a handler.
     *
     * @param handlerName The handler name.
     * @param fnName Name of the function to execute.
     * @param onlyEnabled If check only enabled handlers or all.
     * @return Function returned value or default value.
     */
    protected hasFunction(handlerName: string, fnName: string, onlyEnabled: boolean = true): any {
        const handler = onlyEnabled ? this.enabledHandlers[handlerName] : this.handlers[handlerName];

        return handler && handler[fnName];
    }

    /**
     * Check if a handler name has a registered handler (not necessarily enabled).
     *
     * @param name The handler name.
     * @param enabled Only enabled, or any.
     * @return If the handler is registered or not.
     */
    hasHandler(name: string, enabled: boolean = false): boolean {
        return enabled ? typeof this.enabledHandlers[name] !== 'undefined' : typeof this.handlers[name] !== 'undefined';
    }

    /**
     * Check if a time belongs to the last update handlers call.
     * This is to handle the cases where updateHandlers don't finish in the same order as they're called.
     *
     * @param time Time to check.
     * @return Whether it's the last call.
     */
    isLastUpdateCall(time: number): boolean {
        if (!this.lastUpdateHandlersStart) {
            return true;
        }

        return time == this.lastUpdateHandlersStart;
    }

    /**
     * Register a handler.
     *
     * @param handler The handler delegate object to register.
     * @return True when registered, false if already registered.
     */
    registerHandler(handler: CoreDelegateHandler): boolean {
        const key = handler[this.handlerNameProperty] || handler.name;

        if (typeof this.handlers[key] !== 'undefined') {
            this.logger.log(`Handler '${handler[this.handlerNameProperty]}' already registered`);

            return false;
        }

        this.logger.log(`Registered handler '${handler[this.handlerNameProperty]}'`);
        this.handlers[key] = handler;

        return true;
    }

    /**
     * Update the handler for the current site.
     *
     * @param handler The handler to check.
     * @param time Time this update process started.
     * @return Resolved when done.
     */
    protected updateHandler(handler: CoreDelegateHandler, time: number): Promise<void> {
        const siteId = this.sitesProvider.getCurrentSiteId(),
            currentSite = this.sitesProvider.getCurrentSite();
        let promise;

        if (this.updatePromises[siteId] && this.updatePromises[siteId][handler.name]) {
            // There's already an update ongoing for this handler, return the promise.
            return this.updatePromises[siteId][handler.name];
        } else if (!this.updatePromises[siteId]) {
            this.updatePromises[siteId] = {};
        }

        if (!this.sitesProvider.isLoggedIn()) {
            promise = Promise.reject(null);
        } else if (this.isFeatureDisabled(handler, currentSite)) {
            promise = Promise.resolve(false);
        } else {
            promise = Promise.resolve(handler.isEnabled());
        }

        // Checks if the handler is enabled.
        this.updatePromises[siteId][handler.name] = promise.catch(() => {
            return false;
        }).then((enabled: boolean) => {
            // Check that site hasn't changed since the check started.
            if (this.sitesProvider.getCurrentSiteId() === siteId) {
                const key = handler[this.handlerNameProperty] || handler.name;

                if (enabled) {
                    this.enabledHandlers[key] = handler;
                } else {
                    delete this.enabledHandlers[key];
                }
            }
        }).finally(() => {
            // Update finished, delete the promise.
            delete this.updatePromises[siteId][handler.name];
        });

        return this.updatePromises[siteId][handler.name];
    }

    /**
     * Check if feature is enabled or disabled in the site, depending on the feature prefix and the handler name.
     *
     * @param handler Handler to check.
     * @param site Site to check.
     * @return Whether is enabled or disabled in site.
     */
    protected isFeatureDisabled(handler: CoreDelegateHandler, site: CoreSite): boolean {
        return typeof this.featurePrefix != 'undefined' && site.isFeatureDisabled(this.featurePrefix + handler.name);
    }

    /**
     * Update the handlers for the current site.
     *
     * @return Resolved when done.
     */
    protected updateHandlers(): Promise<void> {
        const promises = [],
            now = Date.now();

        this.logger.debug('Updating handlers for current site.');

        this.lastUpdateHandlersStart = now;

        // Loop over all the handlers.
        for (const name in this.handlers) {
            promises.push(this.updateHandler(this.handlers[name], now));
        }

        return Promise.all(promises).then(() => {
            return true;
        }, () => {
            // Never reject.
            return true;
        }).then(() => {

            // Verify that this call is the last one that was started.
            if (this.isLastUpdateCall(now)) {
                this.handlersInitialized = true;
                this.handlersInitResolve();

                this.updateData();
            }
        });
    }

    /**
     * Update handlers Data.
     * Override this function to update handlers data.
     */
    updateData(): any {
        // To be overridden.
    }
}
