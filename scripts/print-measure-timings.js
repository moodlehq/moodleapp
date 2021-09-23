#!/usr/bin/env node

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

const { readdirSync, readFileSync } = require('fs');

if (process.argv.length < 3) {
    console.error('Missing measure timings storage path argument');
    process.exit(1);
}

const measureTimingsStoragePath = process.argv[2].trimRight('/') + '/';
const files = readdirSync(measureTimingsStoragePath);
const measureTimingsDurations = {};

for (const file of files) {
    const measureTiming = JSON.parse(readFileSync(measureTimingsStoragePath + file));

    measureTimingsDurations[measureTiming.measure] = measureTimingsDurations[measureTiming.measure] ?? [];
    measureTimingsDurations[measureTiming.measure].push(measureTiming.duration);
}

for (const [measure, durations] of Object.entries(measureTimingsDurations)) {
    const totalRuns = durations.length;
    const averageDuration = Math.round(durations.reduce((total, duration) => total + duration) / totalRuns);

    console.log(`${measure} took an average of ${averageDuration}ms per run (in ${totalRuns} runs)`);
}
