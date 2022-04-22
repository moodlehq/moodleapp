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

const performanceMeasuresStoragePath = process.argv[2].trimRight('/') + '/';
const files = readdirSync(performanceMeasuresStoragePath);
const performanceMeasures = {};

if (files.length === 0) {
    console.log('No logs found!');
    process.exit(0);
}

// Aggregate data
for (const file of files) {
    const performanceMeasure = JSON.parse(readFileSync(performanceMeasuresStoragePath + file));

    performanceMeasures[performanceMeasure.name] = performanceMeasures[performanceMeasure.name] ?? {
        duration: [],
        scripting: [],
        styling: [],
        blocking: [],
        longTasks: [],
        database: [],
        networking: [],
    };
    performanceMeasures[performanceMeasure.name].duration.push(performanceMeasure.duration);
    performanceMeasures[performanceMeasure.name].scripting.push(performanceMeasure.scripting);
    performanceMeasures[performanceMeasure.name].styling.push(performanceMeasure.styling);
    performanceMeasures[performanceMeasure.name].blocking.push(performanceMeasure.blocking);
    performanceMeasures[performanceMeasure.name].longTasks.push(performanceMeasure.longTasks);
    performanceMeasures[performanceMeasure.name].database.push(performanceMeasure.database);
    performanceMeasures[performanceMeasure.name].networking.push(performanceMeasure.networking);
}

// Calculate averages
for (const [name, { duration, scripting, styling, blocking, longTasks, database, networking }] of Object.entries(performanceMeasures)) {
    const totalRuns = duration.length;
    const averageDuration = Math.round(duration.reduce((total, duration) => total + duration) / totalRuns);
    const averageScripting = Math.round(scripting.reduce((total, scripting) => total + scripting) / totalRuns);
    const averageStyling = Math.round(styling.reduce((total, styling) => total + styling) / totalRuns);
    const averageBlocking = Math.round(blocking.reduce((total, blocking) => total + blocking) / totalRuns);
    const averageLongTasks = Math.round(longTasks.reduce((total, longTasks) => total + longTasks) / totalRuns);
    const averageDatabase = Math.round(database.reduce((total, database) => total + database) / totalRuns);
    const averageNetworking = Math.round(networking.reduce((total, networking) => total + networking) / totalRuns);

    performanceMeasures[name] = {
        'Total duration': `${averageDuration}ms`,
        'Scripting': `${averageScripting}ms`,
        'Styling': `${averageStyling}ms`,
        'Blocking': `${averageBlocking}ms`,
        '# Network requests': averageNetworking,
        '# DB Queries': averageDatabase,
        '# Long Tasks': averageLongTasks,
        '# runs': totalRuns,
    };
}

// Sort tests
const tests = Object.keys(performanceMeasures).sort();
const sortedPerformanceMeasures = {};

for (const test of tests) {
    sortedPerformanceMeasures[test] = performanceMeasures[test];
}

// Display data
console.table(sortedPerformanceMeasures);
