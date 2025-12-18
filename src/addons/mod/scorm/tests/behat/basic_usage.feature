@app_parallel_run_scorm @addon_mod_scorm @app @mod @mod_scorm @javascript @_switch_iframe
Feature: Test basic usage of SCORM activity in app
  In order to play a SCORM while using the mobile app
  As a student
  I need basic SCORM functionality to work

  # SCORM iframes no longer work in the browser, hence the commented lines in this file.
  # This should be reverted once MOBILE-4503 is solved.

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email                |
      | teacher1 | Teacher   | teacher  | teacher1@example.com |
      | student1 | Student   | student  | student1@example.com |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1        | 0        |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | teacher1 | C1     | editingteacher |
      | student1 | C1     | student        |

#   Scenario: Resume progress when re-entering SCORM
#     Given the following "activities" exist:
#       | activity | name        | intro             | course | idnumber | packagefilepath                                               |
#       | scorm    | Basic SCORM | SCORM description | C1     | scorm    | mod/scorm/tests/packages/RuntimeMinimumCalls_SCORM12-mini.zip |
#     And I entered the course "Course 1" as "student1" in the app
#     When I press "Basic SCORM" in the app
#     And I press "Enter" in the app
#     And I press "Disable fullscreen" in the app
#     Then I should find "2 / 11" in the app
#     And I switch to "scorm_object" iframe
#     And I should see "Play of the game"

#     When I switch to the main frame
#     And I press "Next" in the app
#     And I press "Next" in the app
#     Then I should find "4 / 11" in the app
#     And I switch to "scorm_object" iframe
#     And I should see "Scoring"

#     When I switch to the main frame
#     And I go back in the app
#     Then I should find "1" within "Number of attempts you have made" "ion-item" in the app
#     And I should find "3" within "Grade reported" "ion-item" in the app

#     When I press "Enter" in the app
#     And I press "Disable fullscreen" in the app
#     Then I should find "5 / 11" in the app
#     And I switch to "scorm_object" iframe
#     And I should see "Other Scoring Systems"

  Scenario: TOC displays the right status and opens the right SCO
    Given the following "activities" exist:
      | activity | name        | intro             | course | idnumber | displaycoursestructure | packagefilepath                                               |
      | scorm    | Basic SCORM | SCORM description | C1     | scorm    | 1                      | mod/scorm/tests/packages/RuntimeMinimumCalls_SCORM12-mini.zip |
    And I entered the course "Course 1" as "student1" in the app
    When I press "Basic SCORM" in the app
    Then I should find "Not attempted" within "How to Play" "ion-item" in the app
    And I should find "Not attempted" within "Par?" "ion-item" in the app
    And I should find "Not attempted" within "Keeping Score" "ion-item" in the app
    And I should find "Not attempted" within "Other Scoring Systems" "ion-item" in the app
    And I should find "Not attempted" within "The Rules of Golf" "ion-item" in the app
    And I should find "Not attempted" within "Playing Golf Quiz" "ion-item" in the app
    And I should find "Not attempted" within "How to Have Fun Playing Golf" "ion-item" in the app
    And I should find "Not attempted" within "How to Make Friends Playing Golf" "ion-item" in the app
    And I should find "Not attempted" within "Having Fun Quiz" "ion-item" in the app

    When I press "Enter" in the app
    And I press "Disable fullscreen" in the app
    And I press "TOC" in the app
    Then I should find "Not attempted" within "How to Play" "ion-item" in the app
    And I should find "Not attempted" within "Par?" "ion-item" in the app
    And I should find "Not attempted" within "Keeping Score" "ion-item" in the app
    And I should find "Not attempted" within "Other Scoring Systems" "ion-item" in the app
    And I should find "Not attempted" within "The Rules of Golf" "ion-item" in the app
    And I should find "Not attempted" within "Playing Golf Quiz" "ion-item" in the app
    And I should find "Not attempted" within "How to Have Fun Playing Golf" "ion-item" in the app
    And I should find "Not attempted" within "How to Make Friends Playing Golf" "ion-item" in the app
    And I should find "Not attempted" within "Having Fun Quiz" "ion-item" in the app

    When I press "Close" in the app
    And I press "Next" in the app
    And I press "TOC" in the app
    # Then I should find "Completed" within "How to Play" "ion-item" in the app
    # And I should find "Not attempted" within "Par?" "ion-item" in the app

    When I press "The Rules of Golf" in the app
    Then I should find "6 / 11" in the app
    # And I switch to "scorm_object" iframe
    # And I should see "The Rules of Golf"

    # When I switch to the main frame
    # And I press "TOC" in the app
    # Then I should find "Completed" within "How to Play" "ion-item" in the app
    # And I should find "Completed" within "Par?" "ion-item" in the app
    # And I should find "Not attempted" within "Keeping Score" "ion-item" in the app
    # And I should find "Not attempted" within "Other Scoring Systems" "ion-item" in the app
    # And I should find "Not attempted" within "The Rules of Golf" "ion-item" in the app
    # And I should find "Not attempted" within "Playing Golf Quiz" "ion-item" in the app
    # And I should find "Not attempted" within "How to Have Fun Playing Golf" "ion-item" in the app
    # And I should find "Not attempted" within "How to Make Friends Playing Golf" "ion-item" in the app
    # And I should find "Not attempted" within "Having Fun Quiz" "ion-item" in the app

    # When I press "Close" in the app
    # And I go back in the app
    # Then I should find "Completed" within "How to Play" "ion-item" in the app
    # And I should find "Completed" within "Par?" "ion-item" in the app
    # And I should find "Not attempted" within "Keeping Score" "ion-item" in the app
    # And I should find "Not attempted" within "Other Scoring Systems" "ion-item" in the app
    # And I should find "Completed" within "The Rules of Golf" "ion-item" in the app
    # And I should find "Not attempted" within "Playing Golf Quiz" "ion-item" in the app
    # And I should find "Not attempted" within "How to Have Fun Playing Golf" "ion-item" in the app
    # And I should find "Not attempted" within "How to Make Friends Playing Golf" "ion-item" in the app
    # And I should find "Not attempted" within "Having Fun Quiz" "ion-item" in the app

    # When I press "How to Have Fun Playing Golf" in the app
    # Then I should find "9 / 11" in the app
    # And I switch to "scorm_object" iframe
    # And I should see "How to Have Fun Golfing"

  Scenario: Preview SCORM
    Given the following "activities" exist:
      | activity | name        | intro             | course | idnumber | packagefilepath                                               |
      | scorm    | Basic SCORM | SCORM description | C1     | scorm    | mod/scorm/tests/packages/RuntimeMinimumCalls_SCORM12-mini.zip |
    And I entered the course "Course 1" as "teacher1" in the app
    When I press "Basic SCORM" in the app
    Then I should find "0" within "Number of attempts you have made" "ion-item" in the app

    When I press "Preview" in the app
    And I press "Disable fullscreen" in the app
    And I press "TOC" in the app
    Then I should find "Preview mode" in the app

    When I press "Close" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    Then I should find "11 / 11" in the app

    When I go back in the app
    Then I should find "1" within "Number of attempts you have made" "ion-item" in the app
    # And I should find "9" within "Grade reported" "ion-item" in the app

    # # Check that Preview doesn't start a new attempt.
    # When I press "Start a new attempt" in the app
    # And I press "Preview" in the app
    # And I press "Disable fullscreen" in the app
    # And I press "TOC" in the app
    # Then I should find "Complete" within "How to Play" "ion-item" in the app
    # And I should find "Complete" within "Having Fun Quiz" "ion-item" in the app

    # When I press "Close" in the app
    # And I go back in the app
    # Then I should find "1" within "Number of attempts you have made" "ion-item" in the app

  Scenario: SCORM 2004 works online
    Given the following "activities" exist:
      | activity | name       | course | idnumber | packagefilepath                                                    |
      | scorm    | SCORM 2004 | C1     | scorm    | mod/scorm/tests/packages/RuntimeBasicCalls_SCORM20043rdEdition.zip |
    And I entered the course "Course 1" as "student1" in the app
    When I press "SCORM 2004" in the app
    Then I should be able to press "Enter" in the app

    When I switch network connection to offline
    Then I should find "This activity is not available offline" in the app
    And I should not be able to press "Enter" in the app

    When I switch network connection to wifi
    And I press "Enter" in the app
    And I press "Disable fullscreen" in the app
    Then I should not be able to press "TOC" in the app

    When I switch network connection to offline
    Then I should find "Any changes you make to this activity while offline may not be saved" in the app

    # TODO: When iframes are fixed, test that the iframe actually works. However, the Golf 2004 SCORM has some issues.

  Scenario: Hidden SCOs not displayed in TOC
    Given the following "activities" exist:
      | activity | name          | course | idnumber | packagefilepath                           | displaycoursestructure | hidetoc |
      | scorm    | Complex SCORM | C1     | scorm    | mod/scorm/tests/packages/complexscorm.zip | 1                      | 0       |
    And I entered the course "Course 1" as "student1" in the app
    When I press "Complex SCORM" in the app
    Then I should find "The first content (one SCO)" in the app
    But I should not find "SCO not visible" in the app

    When I press "Enter" in the app
    And I press "Disable fullscreen" in the app
    And I press "TOC" in the app
    Then I should find "The first content (one SCO)" in the app
    But I should not find "SCO not visible" in the app

  Scenario: SCOs with prerequisites cannot be opened until prerequisites have been fulfilled
    Given the following "activities" exist:
      | activity | name          | course | idnumber | packagefilepath                           | displaycoursestructure | hidetoc |
      | scorm    | Complex SCORM | C1     | scorm    | mod/scorm/tests/packages/complexscorm.zip | 1                      | 0       |
    And I entered the course "Course 1" as "student1" in the app
    When I press "Complex SCORM" in the app
    Then I should find "SCO with prerequisite (first and secon SCO)" in the app

    When I press "SCO with prerequisite (first and secon SCO)" in the app
    Then I should be able to press "Enter" in the app
    And I should not be able to press "Disable fullscreen" in the app

    When I press "The first content (one SCO)" in the app
    And I press "Disable fullscreen" in the app
    And I switch to "scorm_object" iframe
    # And I click on "Common operations" "link"
    # And I click on "#set-lesson-status-button" "css_element"
    # And I click on "#ui-id-12" "css_element"
    # And I click on "#set-score-button" "css_element"
    # And I click on "#ui-id-26" "css_element"
    # And I press "Commit changes"
    # And I switch to the main frame
    # And I press "TOC" in the app
    # Then I should find "Passed" within "The first content (one SCO)" "ion-item" in the app
    # And I should not be able to press "SCO with prerequisite (first and secon SCO)" in the app

    # When I press "The second content (one SCO too)" in the app
    # And I switch to "scorm_object" iframe
    # And I click on "Common operations" "link"
    # And I click on "#set-lesson-status-button" "css_element"
    # And I click on "#ui-id-13" "css_element"
    # And I click on "#set-score-button" "css_element"
    # And I click on "#ui-id-28" "css_element"
    # And I press "Commit changes"
    # And I switch to the main frame
    # And I press "TOC" in the app
    # Then I should find "Completed" within "The second content (one SCO too)" "ion-item" in the app
    # And I should be able to press "SCO with prerequisite (first and secon SCO)" in the app

  @lms_from4.2
  Scenario: View events are stored in the log
    Given the following "activities" exist:
      | activity | name        | course | idnumber | packagefilepath                                               |
      | scorm    | Basic SCORM | C1     | scorm    | mod/scorm/tests/packages/RuntimeMinimumCalls_SCORM12-mini.zip |
    And I entered the course "Course 1" as "student1" in the app
    When I press "Basic SCORM" in the app
    And I press "Enter" in the app
    And I press "Disable fullscreen" in the app
    Then I should find "2 / 11" in the app

    When I open a browser tab with url "$WWWROOT"
    And I am on the "System logs report" page logged in as "admin"
    And I set the field "id" to "Course 1"
    And I set the field "user" to "Student student"
    And I press "Get these logs"
    Then I should see "SCORM package: Basic SCORM" in the "Course module viewed" "table_row"
    And I should see "SCORM package: Basic SCORM" in the "Sco launched" "table_row"
    And I should see "1" occurrences of "Sco launched" in the "reportlog" "table"

    When I switch back to the app
    And I press "Next" in the app
    Then I should find "3 / 11" in the app

    When I switch to the browser tab opened by the app
    And I press "Get these logs"
    Then I should see "2" occurrences of "Sco launched" in the "reportlog" "table"
