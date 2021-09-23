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

/**
 * Performance timing for one particular measure.
 */
class measure_timing {

    const STORAGE_FOLDER = '/behatmeasuretimings/';

    /**
     * @var string
     */
    public $measure;

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

    public function __construct(string $measure) {
        $this->measure = $measure;
    }

    /**
     * Start timing.
     */
    public function start(): void {
        $this->start = $this->now();
    }

    /**
     * Stop timing.
     */
    public function end(): void {
        $this->end = $this->now();
        $this->duration = $this->end - $this->start;
    }

    /**
     * Persist measure timing in storage.
     */
    public function store(): void {
        global $CFG;

        $storagefolderpath = $CFG->dirroot . static::STORAGE_FOLDER;

        if (!file_exists($storagefolderpath)) {
            mkdir($storagefolderpath);
        }

        $data = [
            'measure' => $this->measure,
            'start' => $this->start,
            'end' => $this->end,
            'duration' => $this->duration,
        ];

        file_put_contents($storagefolderpath . time() . '.json', json_encode($data));
    }

    /**
     * Get current time.
     *
     * @return int Current time in milliseconds.
     */
    private function now(): int {
        return round(microtime(true) * 1000);
    }

}
