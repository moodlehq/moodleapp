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
 * Script for getting an specific string
 */

// Check we are in CLI.
if (isset($_SERVER['REMOTE_ADDR'])) {
    exit(1);
}
define('MOODLE_INTERNAL', 1);
define('LANGPACKSFOLDER', '../../moodle-langpacks');
define('ASSETSPATH', '../src/assets/lang/');

// Set languages to do. If script is called using a language it will be used as unique.
if (isset($argv[1]) && !empty($argv[1])) {
    $languages = explode(',', $argv[1]);
} else {
    $languages = array();
    $files = scandir(ASSETSPATH);
    foreach ($files as $f) {
        if (strpos($f, ".json")) {
            $languages[] = str_replace(".json", "", $f);
        }
    }
    $languages = array_unique($languages);
}

if (empty($languages)) {
    $languages = array('ar', 'bg', 'ca', 'cs', 'da', 'de', 'en', 'es-mx', 'es', 'eu', 'fa', 'fr', 'he', 'hu', 'it', 'ja', 'nl', 'pl', 'pt-br', 'pt', 'ro', 'ru', 'sv', 'tr', 'zh-cn', 'zh-tw');
}

// Process the index file, just once.
$keys = file_get_contents('langindex.json');
$keys = (array) json_decode($keys);

foreach ($keys as $key => $value) {
    $map = new StdClass();
    if ($value == 'local_moodlemobileapp') {
        $map->file = $value;
        $map->string = $key;
        $exp = explode('.', $key, 3);

        $type = $exp[0];
        if (count($exp) == 3) {
            $component = $exp[1];
            $plainid = $exp[2];
        } else {
            $component = 'moodle';
            $plainid = $exp[1];
        }

        switch($type) {
            case 'addon':
                $map->string_local = "mma.$component.$plainid";
                break;
            case 'core':
                if ($component == 'moodle') {
                    $map->string_local = "mm.core.$plainid";
                } else if ($component == 'mainmenu') {
                    $map->string_local = "mm.sidemenu.$plainid";
                } else {
                    $map->string_local = "mm.$component.$plainid";
                }
                break;
        }
    } else {
        $exp = explode('/', $value, 2);
        $map->file = $exp[0];
        if (count($exp) == 2) {
            $map->string = $exp[1];
        } else {
            $exp = explode('.', $key, 3);

            if (count($exp) == 3) {
                $map->string = $exp[2];
            } else {
                $map->string = $exp[1];
            }
        }
    }

    $keys[$key] = $map;
}
$total = count ($keys);

// Process the languages.
foreach ($languages as $lang) {
    $translations = [];
    $success = 0;
    $langfoldername = str_replace('-', '_', $lang);

    if (!is_dir(LANGPACKSFOLDER.'/'.$langfoldername)) {
        echo "Cannot translate $langfoldername, folder not found";
        continue;
    }

    echo "Processing language $lang";

    // Add the translation to the array.
    foreach ($keys as $key => $value) {
        $file = LANGPACKSFOLDER.'/'.$langfoldername.'/'.$value->file.'.php';
        // Apply translations.
        if (!file_exists($file)) {
            continue;
        }

        $string = [];
        include($file);

        if (!isset($string[$value->string])) {
            if ($value->file != 'local_moodlemobileapp' || !isset($string[$value->string_local])) {
                continue;
            }
            $text = $string[$value->string_local];
        } else {
            $text = $string[$value->string];
        }

        if ($value->file != 'local_moodlemobileapp') {
            $text = str_replace('$a->', '$a.', $text);
            $text = str_replace('{$a', '{{$a', $text);
            $text = str_replace('}', '}}', $text);
            // Prevent double.
            $text = str_replace(array('{{{', '}}}'), array('{{', '}}'), $text);
        }

        $translations[$key] = $text;
        $success++;
    }

    // Sort and save.
    ksort($translations);
    file_put_contents(ASSETSPATH.$lang.'.json', str_replace('\/', '/', json_encode($translations, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)));

    $percentage = floor($success/$total *100);
    echo " -> Processed $success of $total -> $percentage%\n";
}
