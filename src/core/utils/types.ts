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
 * Helper type to infer class instance types.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T> = { new(...args: any[]): T };

/**
 * Helper type to infer whether two types are exactly the same.
 */
export type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

/**
 * Helper to get closure args.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GetClosureArgs<T> = T extends (...args: infer TArgs) => any ? TArgs : never;

/**
 * Helper type to flatten complex types.
 */
export type Pretty<T> = T extends infer U ? {[K in keyof U]: U[K]} : never;

/**
 * Helper to convert some keys of an object to optional.
 */
export type SubPartial<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Helper type to negate a boolean type.
 */
export type Not<T extends boolean> = IsTrue<T> extends true ? false : (IsFalse<T> extends true ? true : boolean);

/**
 * Helper type to check whether a boolean type is exactly `true`.
 */
export type IsTrue<T extends boolean> = Exclude<T, true> extends never ? true : false;

/**
 * Helper type to check whether a boolean type is exactly `false`.
 */
export type IsFalse<T extends boolean> = Exclude<T, false> extends never ? true : false;

/**
 * Helper type to check whether the given tuple contains all the items in a union.
 */
export type TupleContainsAll<TTuple extends unknown[], TItems> = Exclude<
    TItems,
    TTuple[number]
> extends never ? true : false;

/**
 * Helper type to check whether the given tuple contains any items outside of a union.
 */
export type TupleContainsOthers<TTuple extends unknown[], TItems> = Exclude<
    TTuple[number],
    TItems
> extends never ? false : true;

/**
 * Helper type to check whether the given tuple matches the items in a union.
 *
 * This means that the tuple will have all the items from the union, but not any outside of it.
 */
export type TupleMatches<TTuple extends unknown[], TItems> = IsTrue<
    TupleContainsAll<TTuple, TItems> |
    Not<TupleContainsOthers<TTuple, TItems>>
>;

/**
 * Helper type to omit union.
 * You can use it if need to omit an element from types union.
 * If you omit a value in an union with `Omit<TypeUnion, 'value'>` you will obtain
 * the values which are present in both types.
 * For example, you have 3 types:
 *
 * ```
 *  type TypeA = { propA: boolean; propB: string; propToOmit: boolean }
 *  type TypeB = { propA: boolean; propToOmit: boolean }
 *  type TypeUnion = TypeA | TypeB
 * ```
 *
 * @example
 * ```
 *  type Result = Omit<TypeUnion, 'propToOmit'>;
 *  //      ^? type Result = { propA: boolean };
 * ```
 *
 * @example
 * ```
 *  type Result = OmitUnion<TypeUnion, 'propToOmit'>;
 *  //      ^? type Result = { propA: boolean, propB: string } | { propA: boolean }
 * ```
 *
 * @see https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types
 */
export type OmitUnion<T, A extends keyof T> = T extends '' ? never : Omit<T, A>;

/**
 * Helper to create branded types.
 *
 * A branded type can be used to mark other types as having passed some validations.
 *
 * @see https://twitter.com/mattpocockuk/status/1625173884885401600
 */
export type Brand<T, TBrand extends string> = T & { [brand]: TBrand };

declare const brand: unique symbol;

/**
 * Number type excluding NaN values.
 */
export type SafeNumber = Brand<number, 'SafeNumber'>;

/**
 * Check whether a given number is safe to use (does not equal undefined nor NaN).
 *
 * @param value Number value.
 * @returns Whether the number is safe.
 */
export function isSafeNumber(value?: unknown): value is SafeNumber {
    return typeof value === 'number' && !isNaN(value);
}

/**
 * Make sure that a given number is safe to use, and convert it to undefined otherwise.
 *
 * @param value Number value.
 * @returns Branded number value if safe, undefined otherwise.
 */
export function safeNumber(value?: unknown): SafeNumber | undefined {
    if (!isSafeNumber(value)) {
        return undefined;
    }

    return value;
}

/**
 * Helper type to extract the type of each item of an array.
 *
 * @example
 * ```
 *  type Result = ArrayElement<(A|B)[]>;
 *  //      ^? type Result = A|B;
 * ```
 */
export type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends readonly (infer ElementType)[] ?
    ElementType : never;
