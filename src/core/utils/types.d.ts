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
 * Helper type to flatten complex types.
 */
export type Pretty<T> = T extends infer U ? {[K in keyof U]: U[K]} : never;

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
