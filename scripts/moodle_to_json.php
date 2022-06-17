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
 * Script for converting moodle strings to json.
 */

// Check we are in CLI.
if (isset($_SERVER['REMOTE_ADDR'])) {
    exit(1);
}
define('MOODLE_INTERNAL', 1);
define('LANGPACKSFOLDER', '../../moodle-langpacks');
define('APPMODULENAME','local_moodlemobileapp');
define('ASSETSPATH', '../src/assets/lang/');
define('CONFIG', '../moodle.config.json');
define('OVERRIDE_LANG_SUFIX', false);

global $strings;
require_once('lang_functions.php');

$config = file_get_contents(CONFIG);
$config = (array) json_decode($config);
$config_langs = array_keys(get_object_vars($config['languages']));

// Set languages to do. If script is called using a language it will be used as unique.
if (isset($argv[1]) && !empty($argv[1])) {
    $forcedetect = false;
    define('TOTRANSLATE', true);
    $languages = explode(',', $argv[1]);
} else {
    $forcedetect = true;
    define('TOTRANSLATE', false);
    $languages = $config_langs;
}

if (!file_exists(ASSETSPATH)) {
    mkdir(ASSETSPATH);
}


load_langindex();

$added_langs = build_languages($languages);

if ($forcedetect) {
    $new_langs = detect_languages($languages);

    if (!empty($new_langs)) {
        echo "\n\n\nThe following languages are going to be added\n\n\n";
        $added_langs = build_languages($new_langs, $added_langs);
    }
}

add_langs_to_config($added_langs, $config);
