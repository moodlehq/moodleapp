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

export class Galaxy {

    isGalaxy(): boolean {
        return true;
    }

}

export class MilkyWayService extends Galaxy {

    exists?: boolean;
    readonly meaningOfLife = 42;

    private years = 0;

    reduceYears!: (years: number) => number;

    bigBang(): void {
        this.exists = true;
    }

    getTheMeaningOfLife(): number {
        return this.meaningOfLife;
    }

    addYears(years: number): number {
        this.years += years;

        return this.years;
    }

}

Object.defineProperty(MilkyWayService.prototype, 'reduceYears', {
    get: () => function(years: number) {
        // eslint-disable-next-line no-invalid-this
        const self = this as { years: number };

        self.years -= years;

        return self.years;
    },
    enumerable: true,
    configurable: true,
});
