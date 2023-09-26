@mod @mod_scorm @app @javascript @_switch_iframe
Feature: Test basic usage of SCORM activity in app
  In order to play a SCORM while using the mobile app
  As a student
  I need basic SCORM functionality to work

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

  Scenario: Resume progress when re-entering SCORM
    Given the following "activities" exist:
      | activity | name        | intro             | course | idnumber | packagefilepath                                               |
      | scorm    | Basic SCORM | SCORM description | C1     | scorm    | mod/scorm/tests/packages/RuntimeMinimumCalls_SCORM12-mini.zip |
    And I entered the course "Course 1" as "student1" in the app
    When I press "Basic SCORM" in the app
    And I press "Enter" in the app
    And I press "Disable fullscreen" in the app
    Then I should find "2 / 11" in the app
    And I switch to "scorm_object" iframe
    And I should see "Play of the game"

    When I switch to the main frame
    And I press "Next" in the app
    And I press "Next" in the app
    Then I should find "4 / 11" in the app
    And I switch to "scorm_object" iframe
    And I should see "Scoring"

    When I switch to the main frame
    And I press the back button in the app
    And I wait loading to finish in the app
    Then I should find "1" within "Number of attempts you have made" "ion-item" in the app
    And I should find "3" within "Grade reported" "ion-item" in the app

    When I press "Enter" in the app
    And I press "Disable fullscreen" in the app
    Then I should find "5 / 11" in the app
    And I switch to "scorm_object" iframe
    And I should see "Other Scoring Systems"

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
    Then I should find "Completed" within "How to Play" "ion-item" in the app
    And I should find "Not attempted" within "Par?" "ion-item" in the app

    When I press "The Rules of Golf" in the app
    Then I should find "6 / 11" in the app
    And I switch to "scorm_object" iframe
    And I should see "The Rules of Golf"

    When I switch to the main frame
    And I press "TOC" in the app
    Then I should find "Completed" within "How to Play" "ion-item" in the app
    And I should find "Completed" within "Par?" "ion-item" in the app
    And I should find "Not attempted" within "Keeping Score" "ion-item" in the app
    And I should find "Not attempted" within "Other Scoring Systems" "ion-item" in the app
    And I should find "Not attempted" within "The Rules of Golf" "ion-item" in the app
    And I should find "Not attempted" within "Playing Golf Quiz" "ion-item" in the app
    And I should find "Not attempted" within "How to Have Fun Playing Golf" "ion-item" in the app
    And I should find "Not attempted" within "How to Make Friends Playing Golf" "ion-item" in the app
    And I should find "Not attempted" within "Having Fun Quiz" "ion-item" in the app

    When I press "Close" in the app
    And I press the back button in the app
    And I wait loading to finish in the app
    Then I should find "Completed" within "How to Play" "ion-item" in the app
    And I should find "Completed" within "Par?" "ion-item" in the app
    And I should find "Not attempted" within "Keeping Score" "ion-item" in the app
    And I should find "Not attempted" within "Other Scoring Systems" "ion-item" in the app
    And I should find "Completed" within "The Rules of Golf" "ion-item" in the app
    And I should find "Not attempted" within "Playing Golf Quiz" "ion-item" in the app
    And I should find "Not attempted" within "How to Have Fun Playing Golf" "ion-item" in the app
    And I should find "Not attempted" within "How to Make Friends Playing Golf" "ion-item" in the app
    And I should find "Not attempted" within "Having Fun Quiz" "ion-item" in the app

    When I press "How to Have Fun Playing Golf" in the app
    Then I should find "9 / 11" in the app
    And I switch to "scorm_object" iframe
    And I should see "How to Have Fun Golfing"

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

    When I press the back button in the app
    And I wait loading to finish in the app
    Then I should find "1" within "Number of attempts you have made" "ion-item" in the app
    And I should find "9" within "Grade reported" "ion-item" in the app

    # Check that Preview doesn't start a new attempt.
    When I press "Start a new attempt" in the app
    And I press "Preview" in the app
    And I press "Disable fullscreen" in the app
    And I press "TOC" in the app
    Then I should find "Complete" within "How to Play" "ion-item" in the app
    And I should find "Complete" within "Having Fun Quiz" "ion-item" in the app

    When I press "Close" in the app
    And I press the back button in the app
    And I wait loading to finish in the app
    Then I should find "1" within "Number of attempts you have made" "ion-item" in the app

  Scenario: Unsupported SCORM
    Given the following "activities" exist:
      | activity | name      | course | idnumber | packagefilepath                                                    |
      | scorm    | SCORM 1.2 | C1     | scorm2   | mod/scorm/tests/packages/RuntimeBasicCalls_SCORM20043rdEdition.zip |
    And I entered the course "Course 1" as "student1" in the app
    When I press "SCORM 1.2" in the app
    Then I should find "Sorry, the application only supports SCORM 1.2." in the app
