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
 * Helper functions converting moodle strings to json.
 */

function detect_languages($languages, $keys) {
    echo "\n\n\n";

    $all_languages = glob(LANGPACKSFOLDER.'/*' , GLOB_ONLYDIR);
    function get_lang_from_dir($dir) {
        return str_replace('_', '-', explode('/', $dir)[3]);
    }
    function get_lang_not_wp($langname) {
        return (substr($langname, -3) !== '-wp');
    }
    $all_languages = array_map('get_lang_from_dir', $all_languages);
    $all_languages = array_filter($all_languages, 'get_lang_not_wp');

    $detect_lang = array_diff($all_languages, $languages);
    $new_langs = array();
    foreach ($detect_lang as $lang) {
        reset_translations_strings();
        $new = detect_lang($lang, $keys);
        if ($new) {
            $new_langs[$lang] = $lang;
        }
    }

    return $new_langs;
}

function build_languages($languages, $keys, $added_langs = []) {
    // Process the languages.
    foreach ($languages as $lang) {
        reset_translations_strings();
        $ok = build_lang($lang, $keys);
        if ($ok) {
            $added_langs[$lang] = $lang;
        }
    }

    return $added_langs;
}

function get_langindex_keys() {
    $local = 0;
    // Process the index file, just once.
    $keys = file_get_contents('langindex.json');
    $keys = (array) json_decode($keys);

    foreach ($keys as $key => $value) {
        $map = new StdClass();
        if ($value == 'local_moodlemobileapp') {
            $map->file = $value;
            $map->string = $key;
            $local++;
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

    $total = count($keys);
    echo "Total strings to translate $total ($local local)\n";

    return $keys;
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

function get_langfolder($lang) {
    $folder = LANGPACKSFOLDER.'/'.str_replace('-', '_', $lang);
    if (!is_dir($folder) || !is_file($folder.'/langconfig.php')) {
        return false;
    }

    return $folder;
}

function get_translation_strings($langfoldername, $file, $override_folder = false) {
    global $strings;

    if (isset($strings[$file])) {
        return $strings[$file];
    }

    $string = import_translation_strings($langfoldername, $file);
    $string_override = $override_folder ? import_translation_strings($override_folder, $file) : false;

    if ($string) {
        $strings[$file] = $string;
        if ($string_override) {
            $strings[$file] = array_merge($strings[$file], $string_override);
        }
    } else if ($string_override) {
        $strings[$file] = $string_override;
    } else {
        $strings[$file] = false;
    }

    return $strings[$file];
}

function import_translation_strings($langfoldername, $file) {
    $path = $langfoldername.'/'.$file.'.php';
    // Apply translations.
    if (!file_exists($path)) {
        return false;
    }

    $string = [];
    include($path);

    return $string;
}

function reset_translations_strings() {
    global $strings;
    $strings = [];
}

function build_lang($lang, $keys) {
    $langfoldername = get_langfolder($lang);
    if (!$langfoldername) {
        echo "Cannot translate $lang, folder not found";

        return false;
    }

    if (OVERRIDE_LANG_SUFIX) {
        $override_langfolder = get_langfolder($lang.OVERRIDE_LANG_SUFIX);
    } else {
        $override_langfolder = false;
    }

    $total = count($keys);
    $local = 0;

    $langparts = explode('-', $lang, 2);
    $parentname = $langparts[0] ? $langparts[0] : "";
    $parent = "";

    echo "Processing $lang";
    // Check parent language exists.
    if ($parentname != $lang && get_langfolder($parentname)) {
        echo " ($parentname)";
        $parent = $parentname;
    }

    $langFile = false;
    // Not yet translated. Do not override.
    if (file_exists(ASSETSPATH.$lang.'.json')) {
        // Load lang files just once.
        $langFile = file_get_contents(ASSETSPATH.$lang.'.json');
        $langFile = (array) json_decode($langFile);
    }

    $translations = [];
    // Add the translation to the array.
    foreach ($keys as $key => $value) {
        $string = get_translation_strings($langfoldername, $value->file, $override_langfolder);
        // Apply translations.
        if (!$string) {
            if ($value->file == 'donottranslate') {
                // Restore it form the json.
                if ($langFile && is_array($langFile) && isset($langFile[$key])) {
                    $translations[$key] = $langFile[$key];
                } else {
                    // If not present, do not count it in the total.
                    $total--;
                }

                continue;
            }

            if (TOTRANSLATE) {
                echo "\n\t\tTo translate $value->string on $value->file";
            }
            continue;
        }

        if (!isset($string[$value->string]) || ($lang == 'en' && $value->file == 'local_moodlemobileapp')) {
            // Not yet translated. Do not override.
            if ($langFile && is_array($langFile) && isset($langFile[$key])) {
                $translations[$key] = $langFile[$key];

                if ($value->file == 'local_moodlemobileapp') {
                    $local++;
                }
            }
            if (TOTRANSLATE && !isset($string[$value->string])) {
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
            // @TODO: Remove that line when core.cannotconnect and core.login.invalidmoodleversion are completelly changed to use $a
            if (($key == 'core.cannotconnect' || $key == 'core.login.invalidmoodleversion') && strpos($text, '2.4') != false) {
                $text = str_replace('2.4', '{{$a}}', $text);
            }
            $local++;
        }

        $translations[$key] = html_entity_decode($text);
    }

    if (!empty($parent)) {
        $translations['core.parentlanguage'] = $parent;
    } else if (isset($translations['core.parentlanguage'])) {
        unset($translations['core.parentlanguage']);
    }

    // Sort and save.
    ksort($translations);
    file_put_contents(ASSETSPATH.$lang.'.json', str_replace('\/', '/', json_encode($translations, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)));

    $success = count($translations);
    $percentage = floor($success/$total * 100);
    $bar = progressbar($percentage);
    if (strlen($lang) <= 2 && !$parent) {
        echo "\t";
    }
    echo "\t\t$success of $total -> $percentage% $bar ($local local)\n";

    if ($lang == 'en') {
        generate_local_moodlemobileapp($keys, $translations);
        override_component_lang_files($keys, $translations);
    }

    return true;
}

function progressbar($percentage) {
    $done = floor($percentage/10);
    return "\t".str_repeat('=', $done) . str_repeat('-', 10-$done);
}

function detect_lang($lang, $keys) {
    $langfoldername = get_langfolder($lang);
    if (!$langfoldername) {
        echo "Cannot translate $lang, folder not found";

        return false;
    }

    $total = count ($keys);
    $success = 0;
    $local = 0;

    $string = get_translation_strings($langfoldername, 'langconfig');
    $parent = isset($string['parentlanguage']) ? $string['parentlanguage'] : "";
    if (!isset($string['thislanguage'])) {
        echo "Cannot translate $lang, translated name not found";
        return false;
    }

    $title = $lang;
    if ($parent != "" && $parent != $lang) {
        $title .= " ($parent)";
    }
    $langname = $string['thislanguage'];
    $title .= " ".$langname." -D";

    // Add the translation to the array.
    foreach ($keys as $key => $value) {
        $string = get_translation_strings($langfoldername, $value->file);
        // Apply translations.
        if (!$string) {
            // Do not count non translatable in the totals.
            if ($value->file == 'donottranslate') {
                $total--;
            }
            continue;
        }

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

    $percentage = floor($success/$total * 100);
    $bar = progressbar($percentage);

    echo "Checking ".$title.str_repeat("\t", 7 - floor(mb_strlen($title, 'UTF-8')/8));
    echo "\t$success of $total -> $percentage% $bar ($local local)";
    if (($percentage > 75 && $local > 50) || ($percentage > 50 && $local > 75)) {
        echo " \t DETECTED\n";
        return true;
    }
    echo "\n";

    return false;
}

function save_key($key, $value, $filePath) {
    $file = file_get_contents($filePath);
    $file = (array) json_decode($file);
    $value = html_entity_decode($value);
    if (!isset($file[$key]) || $file[$key] != $value) {
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
                switch($component) {
                    case 'moodle':
                        $path .= 'core/lang.json';
                        break;
                    default:
                        $path .= 'core/features/'.str_replace('_', '/', $component).'/lang.json';
                        break;
                }
                break;
            case 'addon':
                $path .= 'addons/'.str_replace('_', '/', $component).'/lang.json';
                break;
            case 'assets':
                $path .= $type.'/'.$component.'.json';
                break;
            default:
                $path .= $type.'/lang.json';
                break;

        }

        if (is_file($path)) {
            save_key($plainid, $value, $path);
        } else {
            echo "Cannot override: $path not found.\n";
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
