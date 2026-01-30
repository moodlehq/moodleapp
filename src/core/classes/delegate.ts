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

import { CoreSites } from '@services/sites';
import { CoreEvents } from '@static/events';
import { CoreSite } from '@classes/sites/site';
import { CoreLogger } from '@static/logger';
import { Subject, BehaviorSubject } from 'rxjs';
import { CorePromisedValue } from './promised-value';

/**
 * Superclass to help creating delegates
 */

export class CoreDelegate<HandlerType extends CoreDelegateHandler> {

    /**
     * Logger instance.
     */
    protected logger: CoreLogger;

    /**
     * List of registered handlers.
     */
    protected handlers: { [s: string]: HandlerType } = {};

    /**
     * List of registered handlers enabled for the current site.
     */
    protected enabledHandlers: { [s: string]: HandlerType } = {};

    /**
     * Default handler
     */
    protected defaultHandler?: HandlerType;

    /**
     * Time when last updateHandler functions started.
     */
    protected lastUpdateHandlersStart = 0;

    /**
     * Feature prefix to check is feature is enabled or disabled in site.
     * This check is only made if not false. Override on the subclass or override isFeatureDisabled function.
     */
    protected featurePrefix?: string;

    /**
     * Name of the property to be used to index the handlers. By default, the handler's name will be used.
     * If your delegate uses a Moodle component name to identify the handlers, please override this property.
     * E.g. CoreCourseModuleDelegate uses 'modName' to index the handlers.
     */
    protected handlerNameProperty = 'name';

    /**
     * Set of promises to update a handler, to prevent doing the same operation twice.
     */
    protected updatePromises: { [siteId: string]: { [name: string]: Promise<void> } } = {};

    /**
     * Subject to subscribe to handlers changes.
     */
    protected handlersUpdated: Subject<void> = new BehaviorSubject<void>(undefined);

    /**
     * Handlers loaded flag.
     */
    protected handlersLoaded = false;

    /**
     * Constructor of the Delegate.
     */
    constructor() {
        this.logger = CoreLogger.getInstance(this.constructor.name);

        // Update handlers on this cases.
        CoreEvents.on(CoreEvents.LOGIN, () => this.updateHandlers());
        CoreEvents.on(CoreEvents.SITE_UPDATED, () => this.updateHandlers());
        CoreEvents.on(CoreEvents.SITE_PLUGINS_LOADED, () => this.updateHandlers());
        CoreEvents.on(CoreEvents.SITE_POLICY_AGREED, (data) => {
            if (data.siteId === CoreSites.getCurrentSiteId()) {
                this.updateHandlers();
            }
        });
        CoreEvents.on(CoreEvents.COMPLETE_REQUIRED_PROFILE_DATA_FINISHED, (data) => {
            if (data.siteId === CoreSites.getCurrentSiteId()) {
                this.updateHandlers();
            }
        });
    }

    /**
     * Check if the delegate is enabled so handlers are not updated if not..
     *
     * @returns Whether the delegate is enabled.
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

    /**
     * Check if handlers are loaded.
     * Execute a certain function in a enabled handler.
     * If the handler isn't found or function isn't defined, call the same function in the default handler.
     *
     * @param handlerName The handler name.
     * @param fnName Name of the function to execute.
     * @param params Parameters to pass to the function.
     * @returns Function returned value or default value.
     */
    protected executeFunctionOnEnabled<T = unknown>(handlerName: string, fnName: string, params?: unknown[]): T | undefined {
        return this.execute<T>(this.enabledHandlers[handlerName], fnName, params);
    }

    /**
     * Execute a certain function in a handler.
     * If the handler isn't found or function isn't defined, call the same function in the default handler.
     *
     * @param handlerName The handler name.
     * @param fnName Name of the function to execute.
     * @param params Parameters to pass to the function.
     * @returns Function returned value or default value.
     */
    protected executeFunction<T = unknown>(handlerName: string, fnName: string, params?: unknown[]): T | undefined {
        return this.execute<T>(this.handlers[handlerName], fnName, params);
    }

    /**
     * Execute a certain function in a handler.
     * If the handler isn't found or function isn't defined, call the same function in the default handler.
     *
     * @param handler The handler.
     * @param fnName Name of the function to execute.
     * @param params Parameters to pass to the function.
     * @returns Function returned value or default value.
     */
    private execute<T = unknown>(handler: HandlerType, fnName: string, params?: unknown[]): T | undefined {
        if (handler && handler[fnName]) {
            return handler[fnName](...(params || []));
        } else if (this.defaultHandler && this.defaultHandler[fnName]) {
            return this.defaultHandler[fnName](...(params || []));
        }
    }

    /**
     * Get a handler.
     *
     * @param handlerName The handler name.
     * @param enabled Only enabled, or any.
     * @returns Handler.
     */
    protected getHandler(handlerName: string, enabled = false): HandlerType {
        return enabled ? this.enabledHandlers[handlerName] : this.handlers[handlerName];
    }

    /**
     * Gets the handler full name for a given name. This is useful when the handlerNameProperty is different than "name".
     * E.g. blocks are indexed by blockName. If you call this function passing the blockName it will return the name.
     *
     * @param name Name used to indentify the handler.
     * @returns Full name of corresponding handler.
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
     * @returns Function returned value or default value.
     */
    protected hasFunction(handlerName: string, fnName: string, onlyEnabled = true): boolean {
        const handler = this.getHandler(handlerName, onlyEnabled);

        return handler && typeof handler[fnName] === 'function';
    }

    /**
     * Check if a handler name has a registered handler (not necessarily enabled).
     *
     * @param name The handler name.
     * @param enabled Only enabled, or any.
     * @returns If the handler is registered or not.
     */
    hasHandler(name: string, enabled = false): boolean {
        return this.getHandler(name, enabled) !== undefined;
    }

    /**
     * Returns if the delegate has any handler.
     *
     * @param enabled Check only enabled handlers or all.
     * @returns True if there's any registered handler, false otherwise.
     */
    hasHandlers(enabled = false): boolean {
        return enabled ? !!Object.keys(this.enabledHandlers).length : !!Object.keys(this.handlers).length;
    }

    /**
     * Check if a time belongs to the last update handlers call.
     * This is to handle the cases where updateHandlers don't finish in the same order as they're called.
     *
     * @param time Time to check.
     * @returns Whether it's the last call.
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
     * @returns True when registered, false if already registered.
     */
    registerHandler(handler: HandlerType): boolean {
        const key = handler[this.handlerNameProperty] || handler.name;

        if (this.handlers[key] !== undefined) {
            this.logger.log(`Handler '${key}' already registered`);

            return false;
        }

        this.logger.log(`Registered handler '${key}'`);
        this.handlers[key] = handler;

        return true;
    }

    /**
     * Update the handler for the current site.
     *
     * @param handler The handler to check.
     * @returns Resolved when done.
     */
    protected updateHandler(handler: HandlerType): Promise<void> {
        const siteId = CoreSites.getCurrentSiteId();
        const currentSite = CoreSites.getCurrentSite();
        let promise: Promise<boolean>;

        if (this.updatePromises[siteId] && this.updatePromises[siteId][handler.name] !== undefined) {
            // There's already an update ongoing for this handler, return the promise.
            return this.updatePromises[siteId][handler.name];
        } else if (!this.updatePromises[siteId]) {
            this.updatePromises[siteId] = {};
        }

        if (!currentSite || this.isFeatureDisabled(handler, currentSite)) {
            promise = Promise.resolve(false);
        } else {
            promise = Promise.resolve(handler.isEnabled()).catch(() => false);
        }

        // Checks if the handler is enabled.
        this.updatePromises[siteId][handler.name] = promise.then((enabled) => {
            // Check that site hasn't changed since the check started.
            if (CoreSites.getCurrentSiteId() !== siteId) {
                return;
            }

            const key = handler[this.handlerNameProperty] || handler.name;

            if (enabled) {
                this.enabledHandlers[key] = handler;
            } else {
                delete this.enabledHandlers[key];
            }

            return;
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
     * @returns Whether is enabled or disabled in site.
     */
    protected isFeatureDisabled(handler: HandlerType, site: CoreSite): boolean {
        return this.featurePrefix !== undefined && site.isFeatureDisabled(this.featurePrefix + handler.name);
    }

    /**
     * Update the handlers for the current site.
     *
     * @returns Resolved when done.
     */
    async updateHandlers(): Promise<void> {
        this.handlersLoaded = false;

        const enabled = await this.isEnabled();

        if (!enabled) {
            this.logger.debug('Delegate not enabled.');

            this.handlersLoaded = true;
            this.handlersUpdated.next();

            return;
        }

        const promises: Promise<void>[] = [];
        const now = Date.now();

        this.logger.debug('Updating handlers for current site.');

        this.lastUpdateHandlersStart = now;

        // Loop over all the handlers.
        for (const name in this.handlers) {
            promises.push(this.updateHandler(this.handlers[name]));
        }

        try {
            await Promise.all(promises);
        } catch {
            // Never reject
        }

        // Verify that this call is the last one that was started.
        if (this.isLastUpdateCall(now)) {
            this.updateData();

            this.handlersLoaded = true;
            this.handlersUpdated.next();
        }
    }

    /**
     * Update handlers Data.
     * Override this function to update handlers data.
     */
    protected updateData(): void {
        // To be overridden.
    }

    /**
     * Waits the handlers to be ready.
     *
     * @returns Resolved when the handlers are ready.
     */
    async waitForReady(): Promise<void> {
        if (this.handlersLoaded) {
            return;
        }

        const promise = new CorePromisedValue<void>();

        const subscription = this.handlersUpdated.subscribe(() => {
            if (this.handlersLoaded) {
                // Resolve.
                promise.resolve();

                subscription?.unsubscribe();
            }
        });

        return promise;
    }

}

/**
 * Base interface for any delegate.
 */
export interface CoreDelegateHandler {
    /**
     * Name of the handler, or name and sub context (AddonMessages, AddonMessages:blockContact, ...).
     * This name will be used to check if the feature is disabled.
     */
    name: string;

    /**
     * Whether or not the handler is enabled on a site level.
     *
     * @returns Whether or not the handler is enabled on a site level.
     */
    isEnabled(): Promise<boolean>;
}

/**
 * Data returned by the delegate for each handler to be displayed.
 */
export type CoreDelegateToDisplay = {
    /**
     * Name of the handler.
     */
    name?: string;

    /**
     * Priority of the handler.
     */
    priority?: number;
};

/**
 * Base interface for a core delegate needed to be displayed.
 */
export interface CoreDelegateDisplayHandler<HandlerData extends CoreDelegateToDisplay> extends CoreDelegateHandler {
    /**
     * The highest priority is displayed first.
     */
    priority?: number;

    /**
     * Returns the data needed to render the handler.
     *
     * @returns Data.
     */
    getDisplayData(): HandlerData;
}
