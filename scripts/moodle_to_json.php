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
define('ASSETSPATH', '../src/assets/lang/');
define('CONFIG', '../src/config.json');

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

// Process the index file, just once.
$keys = file_get_contents('langindex.json');
$keys = (array) json_decode($keys);

foreach ($keys as $key => $value) {
    $map = new StdClass();
    if ($value == 'local_moodlemobileapp') {
        $map->file = $value;
        $map->string = $key;
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

echo "Total strings to translate $total\n";

$add_langs = array();
// Process the languages.
foreach ($languages as $lang) {
    $ok = build_lang($lang, $keys, $total);
    if ($ok) {
        $add_langs[$lang] = $lang;
    }
}

if ($forcedetect) {
    echo "\n\n\n";

    $all_languages = glob(LANGPACKSFOLDER.'/*' , GLOB_ONLYDIR);
    function get_lang_from_dir($dir) {
        return str_replace('_', '-', explode('/', $dir)[3]);
    }
    $all_languages = array_map('get_lang_from_dir', $all_languages);
    $detect_lang = array_diff($all_languages, $languages);
    $new_langs = array();
    foreach ($detect_lang as $lang) {
        $new = detect_lang($lang, $keys, $total);
        if ($new) {
            $new_langs[$lang] = $lang;
        }
    }

    if (!empty($new_langs)) {
        echo "\n\n\nThe following languages are going to be added\n\n\n";
        foreach ($new_langs as $lang) {
            $ok = build_lang($lang, $keys, $total);
            if ($ok) {
                $add_langs[$lang] = $lang;
            }
        }
        add_langs_to_config($add_langs, $config);
    }
} else {
    add_langs_to_config($add_langs, $config);
}

function add_langs_to_config($langs, $config) {
    $changed = false;
    $config_langs = get_object_vars($config['languages']);
    foreach ($langs as $lang) {
        if (!isset($config_langs[$lang])) {
            $langfoldername = str_replace('-', '_', $lang);

            $string = [];
            include(LANGPACKSFOLDER.'/'.$langfoldername.'/langconfig.php');
            $config['languages']->$lang = $string['thislanguage'];
            $changed = true;
        }
    }

    if ($changed) {
        // Sort languages by key.
        $config['languages'] = json_decode( json_encode( $config['languages'] ), true );
        ksort($config['languages']);
        $config['languages'] = json_decode( json_encode( $config['languages'] ), false );
        file_put_contents(CONFIG, json_encode($config, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    }
}

function build_lang($lang, $keys, $total) {
    $local = 0;
    $langFile = false;
    $translations = [];
    $langfoldername = str_replace('-', '_', $lang);

    if (!is_dir(LANGPACKSFOLDER.'/'.$langfoldername) || !is_file(LANGPACKSFOLDER.'/'.$langfoldername.'/langconfig.php')) {
        echo "Cannot translate $langfoldername, folder not found";
        return false;
    }

    $string = [];
    include(LANGPACKSFOLDER.'/'.$langfoldername.'/langconfig.php');
    $parent = isset($string['parentlanguage']) ? $string['parentlanguage'] : "";

    echo "Processing $lang";
    if ($parent != "" && $parent != $lang) {
        echo "($parent)";
    }


    // Add the translation to the array.
    foreach ($keys as $key => $value) {
        $file = LANGPACKSFOLDER.'/'.$langfoldername.'/'.$value->file.'.php';
        // Apply translations.
        if (!file_exists($file)) {
            if (TOTRANSLATE) {
                echo "\n\t\To translate $value->string on $value->file";
            }
            continue;
        }

        $string = [];
        include($file);

        if (!isset($string[$value->string]) || ($lang == 'en' && $value->file == 'local_moodlemobileapp')) {
            // Not yet translated. Do not override.
            if (!$langFile) {
                // Load lang files just once.
                $langFile = file_get_contents(ASSETSPATH.$lang.'.json');
                $langFile = (array) json_decode($langFile);
            }
            if (is_array($langFile) && isset($langFile[$key])) {
                $translations[$key] = $langFile[$key];
                $local++;
            }
            if (TOTRANSLATE) {
                echo "\n\t\tTo translate $value->string on $value->file";
            }
            continue;
        } else {
            $text = $string[$value->string];
        }

        if ($value->file != 'local_moodlemobileapp') {
            $text = str_replace('$a->', '$a.', $text);
            $text = str_replace('{$a', '{{$a', $text);
            $text = str_replace('}', '}}', $text);
            // Prevent double.
            $text = str_replace(array('{{{', '}}}'), array('{{', '}}'), $text);
        } else {
            $local++;
        }

        $translations[$key] = html_entity_decode($text);
    }

    // Sort and save.
    ksort($translations);
    file_put_contents(ASSETSPATH.$lang.'.json', str_replace('\/', '/', json_encode($translations, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)));

    $success = count($translations);
    $percentage = floor($success/$total *100);
    echo "\t\t$success of $total -> $percentage% ($local local)\n";

    if ($lang == 'en') {
        generate_local_moodlemobileapp($keys, $translations);
        override_component_lang_files($keys, $translations);
    }

    return true;
}

function detect_lang($lang, $keys, $total) {
    $success = 0;
    $local = 0;
    $langfoldername = str_replace('-', '_', $lang);

    if (!is_dir(LANGPACKSFOLDER.'/'.$langfoldername) || !is_file(LANGPACKSFOLDER.'/'.$langfoldername.'/langconfig.php')) {
        echo "Cannot translate $langfoldername, folder not found";
        return false;
    }

    $string = [];
    include(LANGPACKSFOLDER.'/'.$langfoldername.'/langconfig.php');
    $parent = isset($string['parentlanguage']) ? $string['parentlanguage'] : "";
    if (!isset($string['thislanguage'])) {
        echo "Cannot translate $langfoldername, name not found";
        return false;
    }

    echo "Checking $lang";
    if ($parent != "" && $parent != $lang) {
        echo "($parent)";
    }
    $langname = $string['thislanguage'];
    echo " ".$langname." -D";

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
            continue;
        } else {
            $text = $string[$value->string];
        }

        if ($value->file == 'local_moodlemobileapp') {
            $local++;
        }

        $success++;
    }

    $percentage = floor($success/$total *100);
    echo "\t\t$success of $total -> $percentage% ($local local)";
    if (($percentage > 75 && $local > 50) || ($percentage > 50 && $local > 75)) {
        echo " \t DETECTED\n";
        return true;
    }
    echo "\n";

    return false;
}

function save_key($key, $value, $path) {
    $filePath = $path . '/en.json';

    $file = file_get_contents($filePath);
    $file = (array) json_decode($file);
    $value = html_entity_decode($value);
    if ($file[$key] != $value) {
        $file[$key] = $value;
        ksort($file);
        file_put_contents($filePath, str_replace('\/', '/', json_encode($file, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)));
    }
}

function override_component_lang_files($keys, $translations) {
    echo "Override component lang files.\n";
    foreach ($translations as $key => $value) {
        $path = '../src/';
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
            case 'core':
            case 'addon':
                switch($component) {
                    case 'moodle':
                        $path .= 'lang';
                        break;
                    default:
                        $path .= $type.'/'.str_replace('_', '/', $component).'/lang';
                        break;
                }
                break;
            case 'assets':
                $path .= $type.'/'.$component;
                break;

        }

        if (is_file($path.'/en.json')) {
            save_key($plainid, $value, $path);
        }
    }
}

/**
 * Generates local moodle mobile app file to update languages in AMOS.
 *
 * @param  [array] $keys         Translation keys.
 * @param  [array] $translations English translations.
 */
function generate_local_moodlemobileapp($keys, $translations) {
    echo "Generate local_moodlemobileapp.\n";
    $string = '<?php
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
 * Version details.
 *
 * @package    local
 * @subpackage moodlemobileapp
 * @copyright  2014 Juan Leyva <juanleyvadelgado@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

$string[\'appstoredescription\'] = \'NOTE: This official Moodle Mobile app will ONLY work with Moodle sites that have been set up to allow it.  Please talk to your Moodle administrator if you have any problems connecting.

If your Moodle site has been configured correctly, you can use this app to:

- browse the content of your courses, even when offline
- receive instant notifications of messages and other events
- quickly find and contact other people in your courses
- upload images, audio, videos and other files from your mobile device
- view your course grades
- and more!

Please see http://docs.moodle.org/en/Mobile_app for all the latest information.

We’d really appreciate any good reviews about the functionality so far, and your suggestions on what else you want this app to do!

The app requires the following permissions:
Record audio - For recording audio to upload to Moodle
Read and modify the contents of your SD card - Contents are downloaded to the SD Card so you can see them offline
Network access - To be able to connect with your Moodle site and check if you are connected or not to switch to offline mode
Run at startup - So you receive local notifications even when the app is running in the background
Prevent phone from sleeping - So you can receive push notifications anytime\';'."\n";
    foreach ($keys as $key => $value) {
        if (isset($translations[$key]) && $value->file == 'local_moodlemobileapp') {
            $string .= '$string[\''.$key.'\'] = \''.str_replace("'", "\'", $translations[$key]).'\';'."\n";
        }
    }
    $string .= '$string[\'pluginname\'] = \'Moodle Mobile language strings\';'."\n";

    file_put_contents('../../moodle-local_moodlemobileapp/lang/en/local_moodlemobileapp.php', $string."\n");
}

