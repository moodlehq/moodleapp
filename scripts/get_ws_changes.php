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
 * Script for detecting changes in a WS params or return data, version by version.
 *
 * The first parameter (required) is the path to the Moodle installation to use.
 * The second parameter (required) is the name to the WS to convert.
 * The third parameter (optional) is a number: 1 to convert the params structure,
 * 0 to convert the returns structure. Defaults to 0.
 */

if (!isset($argv[1])) {
    echo "ERROR: Please pass the path to the folder containing the Moodle installations as the first parameter.\n";
    die();
}

if (!isset($argv[2])) {
    echo "ERROR: Please pass the WS name as the second parameter.\n";
    die();
}

define('CLI_SCRIPT', true);
define('CACHE_DISABLE_ALL', true);
define('SERIALIZED', true);
require_once('ws_to_ts_functions.php');

$versions = array('master', '310', '39', '38', '37', '36', '35', '34', '33', '32', '31');

$moodlespath = $argv[1];
$wsname = $argv[2];
$useparams = (bool)(isset($argv[3]) && $argv[3]);
$pathseparator = '/';

// Get the path to the script.
$index = strrpos(__FILE__, $pathseparator);
if ($index === false) {
    $pathseparator = '\\';
    $index = strrpos(__FILE__, $pathseparator);
}
$scriptfolder = substr(__FILE__, 0, $index);
$scriptpath = concatenate_paths($scriptfolder, 'get_ws_structure.php', $pathseparator);

$previousstructure = null;
$previousversion = null;
$libsloaded = false;

foreach ($versions as $version) {
    $moodlepath = concatenate_paths($moodlespath, 'stable_' . $version . '/moodle', $pathseparator);

    if (!file_exists($moodlepath)) {
        echo "Folder does not exist for version $version, skipping...\n";
        continue;
    }

    if (!$libsloaded) {
        $libsloaded = true;

        require($moodlepath . '/config.php');
        require($CFG->dirroot . '/webservice/lib.php');
    }

    // Get the structure in this Moodle version.
    $structure = shell_exec("php $scriptpath $moodlepath $wsname " . ($useparams ? 'true' : ''));

    if (strpos($structure, 'ERROR:') === 0) {
        echo "WS not found in version $version. Stop.\n";
        break;
    }

    $structure = unserialize($structure);

    if ($previousstructure != null) {
        echo "*** Check changes from version $version to $previousversion ***\n";

        $messages = detect_ws_changes($previousstructure, $structure);

        if (count($messages) > 0) {
            $haschanged = true;

            foreach($messages as $message) {
                echo "$message\n";
            }
        } else {
            echo "No changes found.\n";
        }
        echo "\n";
    }

    $previousstructure = $structure;
    $previousversion = $version;
}
