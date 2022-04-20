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

import { CoreRoutedItemsManagerSource } from './routed-items-manager-source';

type SourceConstructor<T extends CoreRoutedItemsManagerSource = CoreRoutedItemsManagerSource> = {
    getSourceId(...args: unknown[]): string;
    new (...args: unknown[]): T;
};
type SourceConstuctorInstance<T> = T extends { new(...args: unknown[]): infer P } ? P : never;
type InstanceTracking = { instance: CoreRoutedItemsManagerSource; references: unknown[] };
type Instances = Record<string, InstanceTracking>;

/**
 * Tracks CoreRoutedItemsManagerSource instances to reuse between pages.
 */
export class CoreRoutedItemsManagerSourcesTracker {

    private static instances: WeakMap<SourceConstructor, Instances> = new WeakMap();
    private static instanceIds: WeakMap<CoreRoutedItemsManagerSource, string> = new WeakMap();

    /**
     * Retrieve an instance given the constructor arguments or id.
     *
     * @param constructor Source constructor.
     * @param constructorArgumentsOrId Arguments to create a new instance, or the id if it's known.
     * @returns Source.
     */
    static getSource<T extends CoreRoutedItemsManagerSource, C extends SourceConstructor<T>>(
        constructor: C,
        constructorArgumentsOrId: ConstructorParameters<C> | string,
    ): SourceConstuctorInstance<C> | null {
        const id = typeof constructorArgumentsOrId === 'string'
            ? constructorArgumentsOrId
            : constructor.getSourceId(...constructorArgumentsOrId);
        const constructorInstances = this.getConstructorInstances(constructor);

        return constructorInstances[id]?.instance as SourceConstuctorInstance<C>
            ?? null;
    }

    /**
     * Create an instance of the given source or retrieve one if it's already in use.
     *
     * @param constructor Source constructor.
     * @param constructorArguments Arguments to create a new instance, used to find out if an instance already exists.
     * @returns Source.
     */
    static getOrCreateSource<T extends CoreRoutedItemsManagerSource, C extends SourceConstructor<T>>(
        constructor: C,
        constructorArguments: ConstructorParameters<C>,
    ): SourceConstuctorInstance<C> {
        const id = constructor.getSourceId(...constructorArguments);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return this.getSource(constructor, id) as any
            ?? this.createInstance(id, constructor, constructorArguments);
    }

    /**
     * Track an object referencing a source.
     *
     * @param source Source.
     * @param reference Object referncing this source.
     */
    static addReference(source: CoreRoutedItemsManagerSource, reference: unknown): void {
        const constructorInstances = this.getConstructorInstances(source.constructor as SourceConstructor);
        const instanceId = this.instanceIds.get(source);

        if (instanceId === undefined) {
            return;
        }

        if (!(instanceId in constructorInstances)) {
            constructorInstances[instanceId] = {
                instance: source,
                references: [],
            };
        }

        constructorInstances[instanceId].references.push(reference);
    }

    /**
     * Remove a reference to an existing source, freeing it from memory if it's not referenced elsewhere.
     *
     * @param source Source.
     * @param reference Object that was referncing this source.
     */
    static removeReference(source: CoreRoutedItemsManagerSource, reference: unknown): void {
        const constructorInstances = this.instances.get(source.constructor as SourceConstructor);
        const instanceId = this.instanceIds.get(source);
        const index = constructorInstances?.[instanceId ?? '']?.references.indexOf(reference) ?? -1;

        if (!constructorInstances || instanceId === undefined || index === -1) {
            return;
        }

        constructorInstances[instanceId].references.splice(index, 1);

        if (constructorInstances[instanceId].references.length === 0) {
            delete constructorInstances[instanceId];
        }
    }

    /**
     * Get instances for a given constructor.
     *
     * @param constructor Source constructor.
     * @returns Constructor instances.
     */
    private static getConstructorInstances(constructor: SourceConstructor): Instances {
        return this.instances.get(constructor)
            ?? this.initialiseConstructorInstances(constructor);
    }

    /**
     * Initialise instances for a given constructor.
     *
     * @param constructor Source constructor.
     * @returns Constructor instances.
     */
    private static initialiseConstructorInstances(constructor: SourceConstructor): Instances {
        const constructorInstances = {};

        this.instances.set(constructor, constructorInstances);

        return constructorInstances;
    }

    /**
     * Create a new source instance.
     *
     * @param id Source id.
     * @param constructor Source constructor.
     * @param constructorArguments Source constructor arguments.
     * @returns Source instance.
     */
    private static createInstance<T extends CoreRoutedItemsManagerSource>(
        id: string,
        constructor: SourceConstructor<T>,
        constructorArguments: ConstructorParameters<SourceConstructor<T>>,
    ): T {
        const instance = new constructor(...constructorArguments);

        this.instanceIds.set(instance, id);

        return instance;
    }

}
