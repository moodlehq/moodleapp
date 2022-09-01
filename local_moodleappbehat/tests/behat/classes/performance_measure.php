<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

use Behat\Mink\Exception\DriverException;
use Facebook\WebDriver\Exception\InvalidArgumentException;
use Moodle\BehatExtension\Driver\WebDriver;

require_once(__DIR__ . '/../behat_app.php');

/**
 * Performance measures for one particular metric.
 */
class performance_measure implements behat_app_listener {

    const STORAGE_FOLDER = '/behatperformancemeasures/';

    /**
     * @var string
     */
    public $name;

    /**
     * @var int
     */
    public $start;

    /**
     * @var int
     */
    public $end;

    /**
     * @var int
     */
    public $duration;

    /**
     * @var int
     */
    public $scripting;

    /**
     * @var int
     */
    public $styling;

    /**
     * @var int
     */
     public $blocking;

    /**
     * @var int
     */
    public $databaseStart;

    /**
     * @var int
     */
    public $database;

    /**
     * @var int
     */
    public $networking;

    /**
     * @var array
     */
    private $longTasks = [];

    /**
     * @var Closure
     */
    private $behatAppUnsubscribe;

    /**
     * @var Moodle\BehatExtension\Driver\WebDriver
     */
    private $driver;

    public function __construct(string $name, WebDriver $driver) {
        $this->name = $name;
        $this->driver = $driver;
    }

    /**
     * Start timing.
     */
    public function start(): void {
        $this->start = $this->now();

        $this->observeLongTasks();
        $this->startDatabaseCount();

        $this->behatAppUnsubscribe = behat_app::listen($this);
    }

    /**
     * Stop timing.
     */
    public function end(): void {
        $this->end = $this->now();

        $this->stopLongTasksObserver();

        call_user_func($this->behatAppUnsubscribe);
        $this->behatAppUnsubscribe = null;

        $this->analyseDuration();
        $this->analyseLongTasks();
        $this->analyseDatabaseUsage();
        $this->analysePerformanceLogs();
    }

    /**
     * Persist measure logs in storage.
     */
    public function store(): void {
        global $CFG;

        $storagefolderpath = $CFG->dirroot . static::STORAGE_FOLDER;

        if (!file_exists($storagefolderpath)) {
            mkdir($storagefolderpath);
        }

        $data = [
            'name' => $this->name,
            'start' => $this->start,
            'end' => $this->end,
            'duration' => $this->duration,
            'scripting' => $this->scripting,
            'styling' => $this->styling,
            'blocking' => $this->blocking,
            'longTasks' => count($this->longTasks),
            'database' => $this->database,
            'networking' => $this->networking,
        ];

        file_put_contents($storagefolderpath . time() . '.json', json_encode($data));
    }

    /**
     * @inheritdoc
     */
    public function on_app_load(): void {
        if (is_null($this->start) || !is_null($this->end)) {
            return;
        }

        $this->observeLongTasks();
    }

    /**
     * @inheritdoc
     */
    public function on_app_unload(): void {
        $this->stopLongTasksObserver();
    }

    /**
     * Get current time.
     *
     * @return int Current time in milliseconds.
     */
    private function now(): int {
        return $this->driver->evaluateScript('Date.now()');
    }

    /**
     * Start observing long tasks.
     */
    private function observeLongTasks(): void {
        $this->driver->executeScript("
            if (window.MA_PERFORMANCE_OBSERVER) return;

            window.MA_LONG_TASKS = [];
            window.MA_PERFORMANCE_OBSERVER = new PerformanceObserver(list => {
                for (const entry of list.getEntries()) {
                    window.MA_LONG_TASKS.push(entry);
                }
            });
            window.MA_PERFORMANCE_OBSERVER.observe({ entryTypes: ['longtask'] });
        ");
    }

    /**
     * Record how many database queries have been logged so far.
     */
    private function startDatabaseCount(): void {
        try {
            $this->databaseStart = $this->driver->evaluateScript('dbProvider.queryLogs.length') ?? 0;
        } catch (Exception $e) {
            $this->databaseStart = 0;
        }
    }

    /**
     * Flush Performance observer.
     */
    private function stopLongTasksObserver(): void {
        $newLongTasks = $this->driver->evaluateScript("
            return (function() {
                if (!window.MA_PERFORMANCE_OBSERVER) {
                    return [];
                }

                window.MA_PERFORMANCE_OBSERVER.disconnect();

                const observer = window.MA_PERFORMANCE_OBSERVER;
                const longTasks = window.MA_LONG_TASKS;

                delete window.MA_PERFORMANCE_OBSERVER;
                delete window.MA_LONG_TASKS;

                return [...longTasks, ...observer.takeRecords()];
            })();
        ");

        if ($newLongTasks) {
            $this->longTasks = array_merge($this->longTasks, $newLongTasks);
        }
    }

    /**
     * Analyse duration.
     */
    private function analyseDuration(): void {
        $this->duration = $this->end - $this->start;
    }

    /**
     * Analyse long tasks.
     */
    private function analyseLongTasks(): void {
        $blockingDuration = 0;

        foreach ($this->longTasks as $longTask) {
            $blockingDuration += $longTask['duration'] - 50;
        }

        $this->blocking = $blockingDuration;
    }

    /**
     * Analyse database usage.
     */
    private function analyseDatabaseUsage(): void {
        $this->database = $this->driver->evaluateScript('dbProvider.queryLogs.length') - $this->databaseStart;
    }

    /**
     * Analyse performance logs.
     */
    private function analysePerformanceLogs(): void {
        global $CFG;

        $scriptingDuration = 0;
        $stylingDuration = 0;
        $networkingCount = 0;
        $logs = $this->getPerformanceLogs();

        foreach ($logs as $log) {
            // TODO this should filter by end time as well, but it seems like the timestamps are not
            // working as expected.
            if ($log['timestamp'] < $this->start) {
                continue;
            }

            $message = json_decode($log['message'])->message;
            $messagename = $message->params->name ?? '';

            if (in_array($messagename, ['FunctionCall', 'GCEvent', 'MajorGC', 'MinorGC', 'EvaluateScript'])) {
                $scriptingDuration += $message->params->dur;

                continue;
            }

            if (in_array($messagename, ['UpdateLayoutTree', 'RecalculateStyles', 'ParseAuthorStyleSheet'])) {
                $stylingDuration += $message->params->dur;

                continue;
            }

            if (in_array($messagename, ['XHRLoad']) && !str_starts_with($message->params->args->data->url, $CFG->behat_ionic_wwwroot)) {
                $networkingCount++;

                continue;
            }
        }

        $this->scripting = round($scriptingDuration / 1000);
        $this->styling = round($stylingDuration / 1000);
        $this->networking = $networkingCount;
    }

    /**
     * Get performance logs.
     *
     * @return array Performance logs.
     */
    private function getPerformanceLogs(): array {
        try {
            return $this->driver->getWebDriver()->manage()->getLog('performance');
        } catch (InvalidArgumentException $e) {
            throw new DriverException(
                implode("\n", [
                    "It wasn't possible to get performance logs, make sure that you have configured the following capabilities:",
                    "",
                    "\$CFG->behat_profiles = [",
                    "    'default' => [",
                    "        'browser' => 'chrome',",
                    "        'wd_host' => 'http://selenium:4444/wd/hub',",
                    "        'capabilities' => [",
                    "            'extra_capabilities' => [",
                    "                'goog:loggingPrefs' => ['performance' => 'ALL'],",
                    "                'chromeOptions' => [",
                    "                    'perfLoggingPrefs' => [",
                    "                        'traceCategories' => 'devtools.timeline',",
                    "                    ],",
                    "                ],",
                    "            ],",
                    "        ],",
                    "    ],",
                    "];",
                    "",
                ])
            );
        }
    }

}
