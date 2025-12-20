@app_parallel_run_files @core_filesystem @app @javascript
Feature: It opens files properly.

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
      | username |
      | student1 |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |

  Scenario: Open a file
    Given the following "activities" exist:
      | activity | name     | intro                | display | course | defaultfilename |
      | resource | Test TXT | Test TXT description | 5       | C1     | A txt.txt       |
      | resource | Test RTF | Test RTF description | 5       | C1     | A rtf.rtf       |
      | resource | Test DOC | Test DOC description | 5       | C1     | A doc.doc       |
    And the following config values are set as admin:
      | filetypeexclusionlist | rtf,doc | tool_mobile |
    And I entered the course "Course 1" as "student1" in the app
    And I press "Test TXT" in the app
    When I press "Open" in the app
    Then the app should have opened a browser tab with url "^blob:"

    When I switch to the browser tab opened by the app
    Then I should see "Test resource A txt.txt file"

    When I close the browser tab opened by the app
    And I go back in the app
    And I press "Test RTF" in the app
    And I press "Open" in the app
    Then I should find "This file may not work as expected on this device" in the app

    When I press "Open file" in the app
    Then the app should have opened url "^blob:" with contents "Test resource A rtf.rtf file" once

    When I press "Open" in the app
    Then I should find "This file may not work as expected on this device" in the app

    When I select "Don't show again." in the app
    And I press "Open file" in the app
    Then the app should have opened url "^blob:" with contents "Test resource A rtf.rtf file" 2 times

    When I press "Open" in the app
    Then I should not find "This file may not work as expected on this device" in the app
    And the app should have opened url "^blob:" with contents "Test resource A rtf.rtf file" 3 times

    When I go back in the app
    And I press "Test DOC" in the app
    And I press "Open" in the app
    Then I should find "This file may not work as expected on this device" in the app
    And the following events should have been logged for "student1" in the app:
      | name                                     | activity | activityname | course   |
      | \mod_resource\event\course_module_viewed | resource | Test TXT     | Course 1 |
      | \mod_resource\event\course_module_viewed | resource | Test RTF     | Course 1 |
      | \mod_resource\event\course_module_viewed | resource | Test DOC     | Course 1 |

  @lms_from4.3
  Scenario: Open a PDF embedded using an iframe
    Given the following "activities" exist:
      | activity | idnumber | course | name                   | content                                                                                             |
      | page     | page1    | C1     | Page with embedded PDF | <iframe src="#wwwroot#/local/moodleappbehat/fixtures/dummy.pdf" width="100%" height="500"></iframe> |
      | page     | page2    | C1     | Page with embedded web | <iframe src="https://moodle.org" width="100%" height="500" data-open-external="true"></iframe>      |
    And the following config values are set as admin:
      | custommenuitems | PDF item\|#wwwroot#/local/moodleappbehat/fixtures/dummy.pdf\|embedded | tool_mobile |
    And I entered the course "Course 1" as "student1" in the app

    When I press "Page with embedded PDF" in the app
    And I press "Open PDF file" in the app
    Then the app should have opened a browser tab with url "dummy.pdf"

    When I close the browser tab opened by the app
    And I go back in the app
    And I press "Page with embedded web" in the app
    And I press "Open in browser" in the app
    And I press "OK" in the app
    Then the app should have opened a browser tab with url "moodle.org"

    When I close the browser tab opened by the app
    And I switch network connection to offline
    And I press "Open in browser" in the app
    Then I should find "There was a problem connecting to the site. Please check your connection and try again." in the app

    When I press "OK" in the app
    And I go back in the app
    And I press "Page with embedded PDF" in the app
    And I press "Open PDF file" in the app
    Then the app should have opened a browser tab with url "^blob"

    When I close the browser tab opened by the app
    When I switch network connection to wifi
    And I go back to the root page in the app
    And I press the more menu button in the app
    And I press "PDF item" in the app
    And I press "Open PDF file" in the app
    Then the app should have opened a browser tab with url "dummy.pdf"
