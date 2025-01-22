@addon_mod_scorm @app @mod @mod_scorm @javascript @_switch_iframe
Feature: Test attempts and grading settings of SCORM activity in app
  In order to play a SCORM while using the mobile app
  As a student
  I need attempts and grading settings to be applied properly

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

  Scenario: Student cannot do more attempts than the max allowed
    Given the following "activities" exist:
      | activity | name                 | course | idnumber | packagefilepath                                               | maxattempt | lastattemptlock | forcenewattempt |
      | scorm    | SCORM 1 att and lock | C1     | scorm    | mod/scorm/tests/packages/RuntimeMinimumCalls_SCORM12-mini.zip | 1          | 1               | 0               |
      | scorm    | SCORM 1 att no lock  | C1     | scorm2   | mod/scorm/tests/packages/RuntimeMinimumCalls_SCORM12-mini.zip | 1          | 0               | 0               |
      | scorm    | SCORM 2 attempts     | C1     | scorm3   | mod/scorm/tests/packages/RuntimeMinimumCalls_SCORM12-mini.zip | 2          | 0               | 0               |
      | scorm    | SCORM unlimited      | C1     | scorm4   | mod/scorm/tests/packages/RuntimeMinimumCalls_SCORM12-mini.zip | 0          | 0               | 0               |
    And I entered the course "Course 1" as "student1" in the app
    When I press "SCORM 1 att and lock" in the app
    Then I should find "1" within "Number of attempts allowed" "ion-item" in the app
    And I should find "0" within "Number of attempts you have made" "ion-item" in the app

    When I press "Enter" in the app
    And I press "Disable fullscreen" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I go back in the app

    Then I should find "1" within "Number of attempts you have made" "ion-item" in the app
    And I should find "You have reached the maximum number of attempts." in the app
    And I should not be able to press "Enter" in the app
    And I should not be able to press "Preview" in the app

    When I go back in the app
    And I press "SCORM 1 att no lock" in the app
    And I press "Enter" in the app
    And I press "Disable fullscreen" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I go back in the app
    Then I should find "1" within "Number of attempts you have made" "ion-item" in the app
    And I should find "You have reached the maximum number of attempts." in the app
    And I should not find "Start a new attempt" in the app
    And I should be able to press "Enter" in the app
    And I should be able to press "Preview" in the app

    When I press "Enter" in the app
    And I press "Disable fullscreen" in the app
    And I press "TOC" in the app
    # Then I should find "Review mode" in the app

    When I press "Close" in the app
    And I go back in the app
    Then I should find "1" within "Number of attempts you have made" "ion-item" in the app

    When I go back in the app
    And I press "SCORM 2 attempts" in the app
    And I press "Enter" in the app
    And I press "Disable fullscreen" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I go back in the app
    Then I should find "1" within "Number of attempts you have made" "ion-item" in the app
    And I should not find "You have reached the maximum number of attempts." in the app

    # When I press "Start a new attempt" in the app
    # And I press "Enter" in the app
    # And I press "Disable fullscreen" in the app
    # And I press "Next" in the app
    # And I press "Next" in the app
    # And I press "Next" in the app
    # And I press "Next" in the app
    # And I press "Next" in the app
    # And I press "Next" in the app
    # And I press "Next" in the app
    # And I press "Next" in the app
    # And I go back in the app
    # Then I should find "2" within "Number of attempts you have made" "ion-item" in the app
    # And I should find "You have reached the maximum number of attempts." in the app
    # And I should not find "Start a new attempt" in the app

    # When I go back in the app
    # And I press "SCORM unlimited" in the app
    # Then I should find "Unlimited" within "Number of attempts allowed" "ion-item" in the app

  Scenario: New attempts are started when they should based on 'Force new attempt' setting
    Given the following "activities" exist:
      | activity | name                 | course | idnumber | packagefilepath                                               | maxattempt | forcenewattempt |
      | scorm    | SCORM no force       | C1     | scorm    | mod/scorm/tests/packages/RuntimeMinimumCalls_SCORM12-mini.zip | 0          | 0               |
      | scorm    | SCORM when completed | C1     | scorm2   | mod/scorm/tests/packages/RuntimeMinimumCalls_SCORM12-mini.zip | 0          | 1               |
      | scorm    | SCORM always force   | C1     | scorm3   | mod/scorm/tests/packages/RuntimeMinimumCalls_SCORM12-mini.zip | 0          | 2               |
    And I entered the course "Course 1" as "student1" in the app
    When I press "SCORM no force" in the app
    And I press "Enter" in the app
    And I press "Disable fullscreen" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I press "Next" in the app
    And I go back in the app
    Then I should find "1" within "Number of attempts you have made" "ion-item" in the app
    # And I should find "Start a new attempt" in the app

    When I press "Enter" in the app
    And I press "Disable fullscreen" in the app
    And I press "TOC" in the app
    # Then I should find "Review mode" in the app

    When I press "Close" in the app
    And I go back in the app
    Then I should find "1" within "Number of attempts you have made" "ion-item" in the app

    # When I press "Start a new attempt" in the app
    # And I press "Enter" in the app
    # And I press "Disable fullscreen" in the app
    # And I press "TOC" in the app
    # Then I should not find "Review mode" in the app

    # When I press "Close" in the app
    # And I go back in the app
    # Then I should find "2" within "Number of attempts you have made" "ion-item" in the app
    # And I should not find "Start a new attempt" in the app

    # When I go back in the app
    # When I press "SCORM when completed" in the app
    # And I press "Enter" in the app
    # And I press "Disable fullscreen" in the app
    # And I press "Next" in the app
    # And I press "Next" in the app
    # And I press "Next" in the app
    # And I press "Next" in the app
    # And I press "Next" in the app
    # And I press "Next" in the app
    # And I press "Next" in the app
    # And I press "Next" in the app
    # And I go back in the app
    # Then I should find "1" within "Number of attempts you have made" "ion-item" in the app
    # And I should not find "Start a new attempt" in the app

    # When I press "Enter" in the app
    # And I press "Disable fullscreen" in the app
    # And I press "TOC" in the app
    # Then I should not find "Review mode" in the app

    # When I press "Close" in the app
    # And I go back in the app
    # Then I should find "2" within "Number of attempts you have made" "ion-item" in the app
    # And I should not find "Start a new attempt" in the app

    # When I go back in the app
    # When I press "SCORM always force" in the app
    # And I press "Enter" in the app
    # And I press "Disable fullscreen" in the app
    # And I press "Next" in the app
    # And I go back in the app
    # Then I should find "1" within "Number of attempts you have made" "ion-item" in the app
    # And I should not find "Start a new attempt" in the app

    # When I press "Enter" in the app
    # And I press "Disable fullscreen" in the app
    # And I press "Next" in the app
    # And I go back in the app
    # Then I should find "2" within "Number of attempts you have made" "ion-item" in the app
    # And I should not find "Start a new attempt" in the app

#   Scenario: Attempt grade is calculated right based on 'Grading method' setting
#     Given the following "activities" exist:
#       | activity | name          | course | idnumber | packagefilepath                           | maxattempt | grademethod | maxgrade | displaycoursestructure |
#       | scorm    | SCORM scos    | C1     | scorm    | mod/scorm/tests/packages/complexscorm.zip | 0          | 0           | 100      | 1                      |
#       | scorm    | SCORM highest | C1     | scorm2   | mod/scorm/tests/packages/complexscorm.zip | 0          | 1           | 100      | 1                      |
#       | scorm    | SCORM average | C1     | scorm3   | mod/scorm/tests/packages/complexscorm.zip | 0          | 2           | 100      | 1                      |
#       | scorm    | SCORM sum 100 | C1     | scorm4   | mod/scorm/tests/packages/complexscorm.zip | 0          | 3           | 100      | 1                      |
#       | scorm    | SCORM sum 50  | C1     | scorm5   | mod/scorm/tests/packages/complexscorm.zip | 0          | 3           | 50       | 1                      |
#     And I entered the course "Course 1" as "student1" in the app

#     # Case 1: SCORM with learning objects as grading method
#     When I press "SCORM scos" in the app
#     And I press "Enter" in the app
#     And I press "Disable fullscreen" in the app
#     And I switch to "scorm_object" iframe
#     And I click on "Common operations" "link"
#     And I click on "#set-lesson-status-button" "css_element"
#     And I click on "#ui-id-12" "css_element"
#     And I click on "#set-score-button" "css_element"
#     And I click on "#ui-id-26" "css_element"
#     And I press "Commit changes"
#     And I switch to the main frame
#     And I press "TOC" in the app
#     Then I should find "Score: 8" within "The first content (one SCO)" "ion-item" in the app
#     And I should find "Passed" within "The first content (one SCO)" "ion-item" in the app
#     And I should find "Not attempted" within "The second content (one SCO too)" "ion-item" in the app

#     When I press "The second content (one SCO too)" in the app
#     And I switch to "scorm_object" iframe
#     And I click on "Common operations" "link"
#     And I click on "#set-lesson-status-button" "css_element"
#     And I click on "#ui-id-13" "css_element"
#     And I click on "#set-score-button" "css_element"
#     And I click on "#ui-id-28" "css_element"
#     And I press "Commit changes"
#     And I switch to the main frame
#     And I press "TOC" in the app
#     Then I should find "Score: 8" within "The first content (one SCO)" "ion-item" in the app
#     And I should find "Passed" within "The first content (one SCO)" "ion-item" in the app
#     And I should find "Score: 10" within "The second content (one SCO too)" "ion-item" in the app
#     And I should find "Completed" within "The second content (one SCO too)" "ion-item" in the app

#     When I press "Third content (this is an asset)" in the app
#     And I press "TOC" in the app
#     And I press "SCO with subscoes" in the app
#     And I switch to "scorm_object" iframe
#     And I click on "Common operations" "link"
#     And I click on "#set-lesson-status-button" "css_element"
#     And I click on "#ui-id-14" "css_element"
#     And I click on "#set-score-button" "css_element"
#     And I click on "#ui-id-20" "css_element"
#     And I press "Commit changes"
#     And I switch to the main frame
#     And I press "TOC" in the app
#     Then I should find "Score: 2" within "SCO with subscoes" "ion-item" in the app
#     And I should find "Failed" within "SCO with subscoes" "ion-item" in the app

#     When I press "Sub-SCO" in the app
#     And I switch to "scorm_object" iframe
#     And I click on "Common operations" "link"
#     And I click on "#set-lesson-status-button" "css_element"
#     And I click on "#ui-id-14" "css_element"
#     And I click on "#set-score-button" "css_element"
#     And I click on "#ui-id-22" "css_element"
#     And I press "Commit changes"
#     And I switch to the main frame
#     And I press "TOC" in the app
#     Then I should find "Score: 4" in the app

#     When I press "Sub-Sub-SCO" in the app
#     And I switch to "scorm_object" iframe
#     And I click on "Common operations" "link"
#     And I click on "#set-lesson-status-button" "css_element"
#     And I click on "#ui-id-12" "css_element"
#     And I click on "#set-score-button" "css_element"
#     And I click on "#ui-id-24" "css_element"
#     And I press "Commit changes"
#     And I switch to the main frame
#     And I press "TOC" in the app
#     Then I should find "Score: 6" within "Sub-Sub-SCO" "ion-item" in the app
#     And I should find "Passed" within "Sub-Sub-SCO" "ion-item" in the app

#     When I press "SCO with prerequisite (first and secon SCO)" in the app
#     And I switch to "scorm_object" iframe
#     And I click on "Common operations" "link"
#     And I click on "#set-lesson-status-button" "css_element"
#     And I click on "#ui-id-13" "css_element"
#     And I click on "#set-score-button" "css_element"
#     And I click on "#ui-id-25" "css_element"
#     And I press "Commit changes"
#     And I switch to the main frame
#     And I press "TOC" in the app
#     Then I should find "Score: 7" within "SCO with prerequisite (first and secon SCO)" "ion-item" in the app
#     And I should find "Completed" within "SCO with prerequisite (first and secon SCO)" "ion-item" in the app

#     When I press "Close" in the app
#     And I go back in the app
#     Then I should find "5" within "Grade reported" "ion-item" in the app
#     And I should find "Score: 8" within "The first content (one SCO)" "ion-item" in the app

#     # Case 2: SCORM with highest grade as grading method
#     When I go back in the app
#     And I press "SCORM highest" in the app
#     And I press "Enter" in the app
#     And I press "Disable fullscreen" in the app
#     And I switch to "scorm_object" iframe
#     And I click on "Common operations" "link"
#     And I click on "#set-lesson-status-button" "css_element"
#     And I click on "#ui-id-12" "css_element"
#     And I click on "#set-score-button" "css_element"
#     And I click on "#ui-id-26" "css_element"
#     And I press "Commit changes"
#     And I switch to the main frame
#     And I press "TOC" in the app
#     Then I should find "Score: 8" within "The first content (one SCO)" "ion-item" in the app

#     When I press "The second content (one SCO too)" in the app
#     And I switch to "scorm_object" iframe
#     And I click on "Common operations" "link"
#     And I click on "#set-lesson-status-button" "css_element"
#     And I click on "#ui-id-13" "css_element"
#     And I click on "#set-score-button" "css_element"
#     And I click on "#ui-id-28" "css_element"
#     And I press "Commit changes"
#     And I switch to the main frame
#     And I press "TOC" in the app
#     Then I should find "Score: 10" within "The second content (one SCO too)" "ion-item" in the app

#     When I press "Third content (this is an asset)" in the app
#     And I press "TOC" in the app
#     And I press "SCO with subscoes" in the app
#     And I switch to "scorm_object" iframe
#     And I click on "Common operations" "link"
#     And I click on "#set-lesson-status-button" "css_element"
#     And I click on "#ui-id-14" "css_element"
#     And I click on "#set-score-button" "css_element"
#     And I click on "#ui-id-20" "css_element"
#     And I press "Commit changes"
#     And I switch to the main frame
#     And I press "TOC" in the app
#     Then I should find "Score: 2" within "SCO with subscoes" "ion-item" in the app

#     When I press "Sub-SCO" in the app
#     And I switch to "scorm_object" iframe
#     And I click on "Common operations" "link"
#     And I click on "#set-lesson-status-button" "css_element"
#     And I click on "#ui-id-14" "css_element"
#     And I click on "#set-score-button" "css_element"
#     And I click on "#ui-id-22" "css_element"
#     And I press "Commit changes"
#     And I switch to the main frame
#     And I press "TOC" in the app
#     Then I should find "Score: 4" in the app

#     When I press "Sub-Sub-SCO" in the app
#     And I switch to "scorm_object" iframe
#     And I click on "Common operations" "link"
#     And I click on "#set-lesson-status-button" "css_element"
#     And I click on "#ui-id-12" "css_element"
#     And I click on "#set-score-button" "css_element"
#     And I click on "#ui-id-24" "css_element"
#     And I press "Commit changes"
#     And I switch to the main frame
#     And I press "TOC" in the app
#     Then I should find "Score: 6" within "Sub-Sub-SCO" "ion-item" in the app

#     When I press "SCO with prerequisite (first and secon SCO)" in the app
#     And I switch to "scorm_object" iframe
#     And I click on "Common operations" "link"
#     And I click on "#set-lesson-status-button" "css_element"
#     And I click on "#ui-id-13" "css_element"
#     And I click on "#set-score-button" "css_element"
#     And I click on "#ui-id-25" "css_element"
#     And I press "Commit changes"
#     And I switch to the main frame
#     And I go back in the app
#     Then I should find "10" within "Grade reported" "ion-item" in the app

#     # Case 3: SCORM with average grade as grading method
#     When I go back in the app
#     And I press "SCORM average" in the app
#     And I press "Enter" in the app
#     And I press "Disable fullscreen" in the app
#     And I switch to "scorm_object" iframe
#     And I click on "Common operations" "link"
#     And I click on "#set-lesson-status-button" "css_element"
#     And I click on "#ui-id-12" "css_element"
#     And I click on "#set-score-button" "css_element"
#     And I click on "#ui-id-26" "css_element"
#     And I press "Commit changes"
#     And I switch to the main frame
#     And I press "TOC" in the app
#     Then I should find "Score: 8" within "The first content (one SCO)" "ion-item" in the app

#     When I press "The second content (one SCO too)" in the app
#     And I switch to "scorm_object" iframe
#     And I click on "Common operations" "link"
#     And I click on "#set-lesson-status-button" "css_element"
#     And I click on "#ui-id-13" "css_element"
#     And I click on "#set-score-button" "css_element"
#     And I click on "#ui-id-28" "css_element"
#     And I press "Commit changes"
#     And I switch to the main frame
#     And I press "TOC" in the app
#     Then I should find "Score: 10" within "The second content (one SCO too)" "ion-item" in the app

#     When I press "Third content (this is an asset)" in the app
#     And I press "TOC" in the app
#     And I press "SCO with subscoes" in the app
#     And I switch to "scorm_object" iframe
#     And I click on "Common operations" "link"
#     And I click on "#set-lesson-status-button" "css_element"
#     And I click on "#ui-id-14" "css_element"
#     And I click on "#set-score-button" "css_element"
#     And I click on "#ui-id-20" "css_element"
#     And I press "Commit changes"
#     And I switch to the main frame
#     And I press "TOC" in the app
#     Then I should find "Score: 2" within "SCO with subscoes" "ion-item" in the app

#     When I press "Sub-SCO" in the app
#     And I switch to "scorm_object" iframe
#     And I click on "Common operations" "link"
#     And I click on "#set-lesson-status-button" "css_element"
#     And I click on "#ui-id-14" "css_element"
#     And I click on "#set-score-button" "css_element"
#     And I click on "#ui-id-22" "css_element"
#     And I press "Commit changes"
#     And I switch to the main frame
#     And I press "TOC" in the app
#     Then I should find "Score: 4" in the app

#     When I press "Sub-Sub-SCO" in the app
#     And I switch to "scorm_object" iframe
#     And I click on "Common operations" "link"
#     And I click on "#set-lesson-status-button" "css_element"
#     And I click on "#ui-id-12" "css_element"
#     And I click on "#set-score-button" "css_element"
#     And I click on "#ui-id-24" "css_element"
#     And I press "Commit changes"
#     And I switch to the main frame
#     And I press "TOC" in the app
#     Then I should find "Score: 6" within "Sub-Sub-SCO" "ion-item" in the app

#     When I press "SCO with prerequisite (first and secon SCO)" in the app
#     And I switch to "scorm_object" iframe
#     And I click on "Common operations" "link"
#     And I click on "#set-lesson-status-button" "css_element"
#     And I click on "#ui-id-13" "css_element"
#     And I click on "#set-score-button" "css_element"
#     And I click on "#ui-id-25" "css_element"
#     And I press "Commit changes"
#     And I switch to the main frame
#     And I go back in the app
#     Then I should find "6.17%" within "Grade reported" "ion-item" in the app

#     # Case 4: SCORM with sum grade as grading method and a max grade of 100
#     When I go back in the app
#     And I press "SCORM sum 100" in the app
#     And I press "Enter" in the app
#     And I press "Disable fullscreen" in the app
#     And I switch to "scorm_object" iframe
#     And I click on "Common operations" "link"
#     And I click on "#set-lesson-status-button" "css_element"
#     And I click on "#ui-id-12" "css_element"
#     And I click on "#set-score-button" "css_element"
#     And I click on "#ui-id-26" "css_element"
#     And I press "Commit changes"
#     And I switch to the main frame
#     And I press "TOC" in the app
#     Then I should find "Score: 8" within "The first content (one SCO)" "ion-item" in the app

#     When I press "The second content (one SCO too)" in the app
#     And I switch to "scorm_object" iframe
#     And I click on "Common operations" "link"
#     And I click on "#set-lesson-status-button" "css_element"
#     And I click on "#ui-id-13" "css_element"
#     And I click on "#set-score-button" "css_element"
#     And I click on "#ui-id-28" "css_element"
#     And I press "Commit changes"
#     And I switch to the main frame
#     And I press "TOC" in the app
#     Then I should find "Score: 10" within "The second content (one SCO too)" "ion-item" in the app

#     When I press "Third content (this is an asset)" in the app
#     And I press "TOC" in the app
#     And I press "SCO with subscoes" in the app
#     And I switch to "scorm_object" iframe
#     And I click on "Common operations" "link"
#     And I click on "#set-lesson-status-button" "css_element"
#     And I click on "#ui-id-14" "css_element"
#     And I click on "#set-score-button" "css_element"
#     And I click on "#ui-id-20" "css_element"
#     And I press "Commit changes"
#     And I switch to the main frame
#     And I press "TOC" in the app
#     Then I should find "Score: 2" within "SCO with subscoes" "ion-item" in the app

#     When I press "Sub-SCO" in the app
#     And I switch to "scorm_object" iframe
#     And I click on "Common operations" "link"
#     And I click on "#set-lesson-status-button" "css_element"
#     And I click on "#ui-id-14" "css_element"
#     And I click on "#set-score-button" "css_element"
#     And I click on "#ui-id-22" "css_element"
#     And I press "Commit changes"
#     And I switch to the main frame
#     And I press "TOC" in the app
#     Then I should find "Score: 4" in the app

#     When I press "Sub-Sub-SCO" in the app
#     And I switch to "scorm_object" iframe
#     And I click on "Common operations" "link"
#     And I click on "#set-lesson-status-button" "css_element"
#     And I click on "#ui-id-12" "css_element"
#     And I click on "#set-score-button" "css_element"
#     And I click on "#ui-id-24" "css_element"
#     And I press "Commit changes"
#     And I switch to the main frame
#     And I press "TOC" in the app
#     Then I should find "Score: 6" within "Sub-Sub-SCO" "ion-item" in the app

#     When I press "SCO with prerequisite (first and secon SCO)" in the app
#     And I switch to "scorm_object" iframe
#     And I click on "Common operations" "link"
#     And I click on "#set-lesson-status-button" "css_element"
#     And I click on "#ui-id-13" "css_element"
#     And I click on "#set-score-button" "css_element"
#     And I click on "#ui-id-25" "css_element"
#     And I press "Commit changes"
#     And I switch to the main frame
#     And I go back in the app
#     Then I should find "37%" within "Grade reported" "ion-item" in the app

#     # Case 5: SCORM with sum grade as grading method and a max grade of 50
#     When I go back in the app
#     And I press "SCORM sum 50" in the app
#     And I press "Enter" in the app
#     And I press "Disable fullscreen" in the app
#     And I switch to "scorm_object" iframe
#     And I click on "Common operations" "link"
#     And I click on "#set-lesson-status-button" "css_element"
#     And I click on "#ui-id-12" "css_element"
#     And I click on "#set-score-button" "css_element"
#     And I click on "#ui-id-26" "css_element"
#     And I press "Commit changes"
#     And I switch to the main frame
#     And I press "TOC" in the app
#     Then I should find "Score: 8" within "The first content (one SCO)" "ion-item" in the app

#     When I press "The second content (one SCO too)" in the app
#     And I switch to "scorm_object" iframe
#     And I click on "Common operations" "link"
#     And I click on "#set-lesson-status-button" "css_element"
#     And I click on "#ui-id-13" "css_element"
#     And I click on "#set-score-button" "css_element"
#     And I click on "#ui-id-28" "css_element"
#     And I press "Commit changes"
#     And I switch to the main frame
#     And I press "TOC" in the app
#     Then I should find "Score: 10" within "The second content (one SCO too)" "ion-item" in the app

#     When I press "Third content (this is an asset)" in the app
#     And I press "TOC" in the app
#     And I press "SCO with subscoes" in the app
#     And I switch to "scorm_object" iframe
#     And I click on "Common operations" "link"
#     And I click on "#set-lesson-status-button" "css_element"
#     And I click on "#ui-id-14" "css_element"
#     And I click on "#set-score-button" "css_element"
#     And I click on "#ui-id-20" "css_element"
#     And I press "Commit changes"
#     And I switch to the main frame
#     And I press "TOC" in the app
#     Then I should find "Score: 2" within "SCO with subscoes" "ion-item" in the app

#     When I press "Sub-SCO" in the app
#     And I switch to "scorm_object" iframe
#     And I click on "Common operations" "link"
#     And I click on "#set-lesson-status-button" "css_element"
#     And I click on "#ui-id-14" "css_element"
#     And I click on "#set-score-button" "css_element"
#     And I click on "#ui-id-22" "css_element"
#     And I press "Commit changes"
#     And I switch to the main frame
#     And I press "TOC" in the app
#     Then I should find "Score: 4" in the app

#     When I press "Sub-Sub-SCO" in the app
#     And I switch to "scorm_object" iframe
#     And I click on "Common operations" "link"
#     And I click on "#set-lesson-status-button" "css_element"
#     And I click on "#ui-id-12" "css_element"
#     And I click on "#set-score-button" "css_element"
#     And I click on "#ui-id-24" "css_element"
#     And I press "Commit changes"
#     And I switch to the main frame
#     And I press "TOC" in the app
#     Then I should find "Score: 6" within "Sub-Sub-SCO" "ion-item" in the app

#     When I press "SCO with prerequisite (first and secon SCO)" in the app
#     And I switch to "scorm_object" iframe
#     And I click on "Common operations" "link"
#     And I click on "#set-lesson-status-button" "css_element"
#     And I click on "#ui-id-13" "css_element"
#     And I click on "#set-score-button" "css_element"
#     And I click on "#ui-id-25" "css_element"
#     And I press "Commit changes"
#     And I switch to the main frame
#     And I go back in the app
#     Then I should find "74%" within "Grade reported" "ion-item" in the app

#   Scenario: SCORM grade is calculated right based on 'Attempts grading' setting
#     Given the following "activities" exist:
#       | activity | name          | course | idnumber | packagefilepath                             | maxattempt | whatgrade | grademethod | forcenewattempt |
#       | scorm    | SCORM highest | C1     | scorm    | mod/scorm/tests/packages/singlescobasic.zip | 0          | 0         | 1           | 0               |
#       | scorm    | SCORM average | C1     | scorm2   | mod/scorm/tests/packages/singlescobasic.zip | 0          | 1         | 1           | 0               |
#       | scorm    | SCORM first   | C1     | scorm3   | mod/scorm/tests/packages/singlescobasic.zip | 0          | 2         | 1           | 0               |
#       | scorm    | SCORM last    | C1     | scorm4   | mod/scorm/tests/packages/singlescobasic.zip | 0          | 3         | 1           | 0               |
#     And I entered the course "Course 1" as "student1" in the app

#     # Case 1: perform 3 attempts in 'SCORM highest' and check the highest grade is the one used.
#     When I press "SCORM highest" in the app
#     Then I should find "Highest attempt" within "Grading method" "ion-item" in the app
#     And I should find "Grade couldn't be calculated" within "Grade reported" "ion-item" in the app

#     When I press "Enter" in the app
#     And I press "Disable fullscreen" in the app
#     And I switch to "scorm_object" iframe
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I switch to "contentFrame" iframe
#     Then I should see "Knowledge Check"

#     When I click on "#question_com\.scorm\.golfsamples\.interactions\.playing_1_1" "css_element"
#     And I click on "#question_com\.scorm\.golfsamples\.interactions\.playing_2_3" "css_element"
#     And I press "Submit Answers"
#     Then I should see "Score: 27"

#     When I switch to the main frame
#     And I switch to "scorm_object" iframe
#     And I press "Exit"
#     And I switch to the main frame
#     And I go back in the app
#     And I press "Grades" in the app
#     Then I should find "27%" within "Grade reported" "ion-item" in the app
#     And I should find "27%" within "Grade for attempt 1" "ion-item" in the app

#     When I press "Start a new attempt" in the app
#     And I press "Enter" in the app
#     And I press "Disable fullscreen" in the app
#     And I switch to "scorm_object" iframe
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I switch to "contentFrame" iframe
#     Then I should see "Knowledge Check"

#     When I click on "#question_com\.scorm\.golfsamples\.interactions\.playing_1_1" "css_element"
#     And I click on "#question_com\.scorm\.golfsamples\.interactions\.playing_2_3" "css_element"
#     And I click on "#question_com\.scorm\.golfsamples\.interactions\.playing_4_True" "css_element"
#     And I click on "#question_com\.scorm\.golfsamples\.interactions\.etiquette_1_2" "css_element"
#     And I press "Submit Answers"
#     Then I should see "Score: 40"

#     When I switch to the main frame
#     And I switch to "scorm_object" iframe
#     And I press "Exit"
#     And I switch to the main frame
#     And I go back in the app
#     Then I should find "40%" within "Grade reported" "ion-item" in the app
#     And I should find "27%" within "Grade for attempt 1" "ion-item" in the app
#     And I should find "40%" within "Grade for attempt 2" "ion-item" in the app

#     When I press "Start a new attempt" in the app
#     And I press "Enter" in the app
#     And I press "Disable fullscreen" in the app
#     And I switch to "scorm_object" iframe
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I switch to "contentFrame" iframe
#     Then I should see "Knowledge Check"

#     When I click on "#question_com\.scorm\.golfsamples\.interactions\.playing_1_1" "css_element"
#     And I press "Submit Answers"
#     Then I should see "Score: 20"

#     When I switch to the main frame
#     And I switch to "scorm_object" iframe
#     And I press "Exit"
#     And I switch to the main frame
#     And I go back in the app
#     Then I should find "40%" within "Grade reported" "ion-item" in the app
#     And I should find "27%" within "Grade for attempt 1" "ion-item" in the app
#     And I should find "40%" within "Grade for attempt 2" "ion-item" in the app
#     And I should find "20%" within "Grade for attempt 3" "ion-item" in the app

#     # Case 2: perform 2 attempts in 'SCORM average' and check the average grade is used.
#     When I go back in the app
#     And I press "SCORM average" in the app
#     Then I should find "Average attempts" within "Grading method" "ion-item" in the app
#     And I should find "Grade couldn't be calculated" within "Grade reported" "ion-item" in the app

#     When I press "Enter" in the app
#     And I press "Disable fullscreen" in the app
#     And I switch to "scorm_object" iframe
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I switch to "contentFrame" iframe
#     Then I should see "Knowledge Check"

#     When I click on "#question_com\.scorm\.golfsamples\.interactions\.playing_1_1" "css_element"
#     And I press "Submit Answers"
#     Then I should see "Score: 20"

#     When I switch to the main frame
#     And I switch to "scorm_object" iframe
#     And I press "Exit"
#     And I switch to the main frame
#     And I go back in the app
#     And I press "Grades" in the app
#     Then I should find "20%" within "Grade reported" "ion-item" in the app
#     And I should find "20%" within "Grade for attempt 1" "ion-item" in the app

#     When I press "Start a new attempt" in the app
#     And I press "Enter" in the app
#     And I press "Disable fullscreen" in the app
#     And I switch to "scorm_object" iframe
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I switch to "contentFrame" iframe
#     Then I should see "Knowledge Check"

#     When I click on "#question_com\.scorm\.golfsamples\.interactions\.playing_1_1" "css_element"
#     And I click on "#question_com\.scorm\.golfsamples\.interactions\.playing_2_3" "css_element"
#     And I click on "#question_com\.scorm\.golfsamples\.interactions\.playing_4_True" "css_element"
#     And I click on "#question_com\.scorm\.golfsamples\.interactions\.etiquette_1_2" "css_element"
#     And I press "Submit Answers"
#     Then I should see "Score: 40"

#     When I switch to the main frame
#     And I switch to "scorm_object" iframe
#     And I press "Exit"
#     And I switch to the main frame
#     And I go back in the app
#     Then I should find "30%" within "Grade reported" "ion-item" in the app
#     And I should find "20%" within "Grade for attempt 1" "ion-item" in the app
#     And I should find "40%" within "Grade for attempt 2" "ion-item" in the app

#     # Case 3: perform 2 attempts in 'SCORM first' and check the first attempt is used.
#     When I go back in the app
#     And I press "SCORM first" in the app
#     Then I should find "First attempt" within "Grading method" "ion-item" in the app
#     And I should find "Grade couldn't be calculated" within "Grade reported" "ion-item" in the app

#     When I press "Enter" in the app
#     And I press "Disable fullscreen" in the app
#     And I switch to "scorm_object" iframe
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I switch to "contentFrame" iframe
#     Then I should see "Knowledge Check"

#     When I click on "#question_com\.scorm\.golfsamples\.interactions\.playing_1_1" "css_element"
#     And I click on "#question_com\.scorm\.golfsamples\.interactions\.playing_2_3" "css_element"
#     And I press "Submit Answers"
#     Then I should see "Score: 27"

#     When I switch to the main frame
#     And I switch to "scorm_object" iframe
#     And I press "Exit"
#     And I switch to the main frame
#     And I go back in the app
#     And I press "Grades" in the app
#     Then I should find "27%" within "Grade reported" "ion-item" in the app
#     And I should find "27%" within "Grade for attempt 1" "ion-item" in the app

#     When I press "Start a new attempt" in the app
#     And I press "Enter" in the app
#     And I press "Disable fullscreen" in the app
#     And I switch to "scorm_object" iframe
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I switch to "contentFrame" iframe
#     Then I should see "Knowledge Check"

#     When I click on "#question_com\.scorm\.golfsamples\.interactions\.playing_1_1" "css_element"
#     And I click on "#question_com\.scorm\.golfsamples\.interactions\.playing_2_3" "css_element"
#     And I click on "#question_com\.scorm\.golfsamples\.interactions\.playing_4_True" "css_element"
#     And I click on "#question_com\.scorm\.golfsamples\.interactions\.etiquette_1_2" "css_element"
#     And I press "Submit Answers"
#     Then I should see "Score: 40"

#     When I switch to the main frame
#     And I switch to "scorm_object" iframe
#     And I press "Exit"
#     And I switch to the main frame
#     And I go back in the app
#     Then I should find "27%" within "Grade reported" "ion-item" in the app
#     And I should find "27%" within "Grade for attempt 1" "ion-item" in the app
#     And I should find "40%" within "Grade for attempt 2" "ion-item" in the app

#     # Case 4: perform 3 attempts in 'SCORM last' and check the last completed attempt is used.
#     When I go back in the app
#     And I press "SCORM last" in the app
#     Then I should find "Last completed attempt" within "Grading method" "ion-item" in the app
#     And I should find "Grade couldn't be calculated" within "Grade reported" "ion-item" in the app

#     When I press "Enter" in the app
#     And I press "Disable fullscreen" in the app
#     And I switch to "scorm_object" iframe
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I switch to "contentFrame" iframe
#     Then I should see "Knowledge Check"

#     When I click on "#question_com\.scorm\.golfsamples\.interactions\.playing_1_1" "css_element"
#     And I click on "#question_com\.scorm\.golfsamples\.interactions\.playing_2_3" "css_element"
#     And I set the field with xpath "//input[@id='question_com.scorm.golfsamples.interactions.playing_3_Text']" to "18"
#     And I click on "#question_com\.scorm\.golfsamples\.interactions\.playing_4_True" "css_element"
#     And I set the field with xpath "//input[@id='question_com.scorm.golfsamples.interactions.playing_5_Text']" to "3"
#     And I click on "#question_com\.scorm\.golfsamples\.interactions\.etiquette_2_True" "css_element"
#     And I click on "#question_com\.scorm\.golfsamples\.interactions\.etiquette_1_2" "css_element"
#     And I click on "#question_com\.scorm\.golfsamples\.interactions\.etiquette_3_0" "css_element"
#     And I click on "#question_com\.scorm\.golfsamples\.interactions\.handicap_1_2" "css_element"
#     And I click on "#question_com\.scorm\.golfsamples\.interactions\.fun_1_False" "css_element"
#     And I click on "#question_com\.scorm\.golfsamples\.interactions\.fun_2_False" "css_element"
#     And I click on "#question_com\.scorm\.golfsamples\.interactions\.fun_3_False" "css_element"
#     And I press "Submit Answers"
#     Then I should see "Score: 87"

#     When I switch to the main frame
#     And I switch to "scorm_object" iframe
#     And I press "Exit"
#     And I switch to the main frame
#     And I go back in the app
#     And I press "Grades" in the app
#     Then I should find "87%" within "Grade reported" "ion-item" in the app
#     And I should find "87%" within "Grade for attempt 1" "ion-item" in the app

#     When I press "Start a new attempt" in the app
#     And I press "Enter" in the app
#     And I press "Disable fullscreen" in the app
#     And I switch to "scorm_object" iframe
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I switch to "contentFrame" iframe
#     Then I should see "Knowledge Check"

#     When I click on "#question_com\.scorm\.golfsamples\.interactions\.playing_1_1" "css_element"
#     And I click on "#question_com\.scorm\.golfsamples\.interactions\.playing_2_3" "css_element"
#     And I press "Submit Answers"
#     Then I should see "Score: 27"

#     When I switch to the main frame
#     And I switch to "scorm_object" iframe
#     And I press "Exit"
#     And I switch to the main frame
#     And I go back in the app
#     # Grade reported belongs to attempt 1 because the second attempt's only SCO is failed.
#     Then I should find "87%" within "Grade reported" "ion-item" in the app
#     And I should find "87%" within "Grade for attempt 1" "ion-item" in the app
#     And I should find "27%" within "Grade for attempt 2" "ion-item" in the app

#     When I press "Start a new attempt" in the app
#     And I press "Enter" in the app
#     And I press "Disable fullscreen" in the app
#     And I switch to "scorm_object" iframe
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I press "Next"
#     And I switch to "contentFrame" iframe
#     Then I should see "Knowledge Check"

#     When I click on "#question_com\.scorm\.golfsamples\.interactions\.playing_1_1" "css_element"
#     And I click on "#question_com\.scorm\.golfsamples\.interactions\.playing_2_3" "css_element"
#     And I click on "#question_com\.scorm\.golfsamples\.interactions\.playing_4_True" "css_element"
#     And I click on "#question_com\.scorm\.golfsamples\.interactions\.etiquette_2_True" "css_element"
#     And I click on "#question_com\.scorm\.golfsamples\.interactions\.etiquette_1_2" "css_element"
#     And I click on "#question_com\.scorm\.golfsamples\.interactions\.etiquette_3_0" "css_element"
#     And I click on "#question_com\.scorm\.golfsamples\.interactions\.handicap_1_2" "css_element"
#     And I click on "#question_com\.scorm\.golfsamples\.interactions\.fun_1_False" "css_element"
#     And I click on "#question_com\.scorm\.golfsamples\.interactions\.fun_2_False" "css_element"
#     And I click on "#question_com\.scorm\.golfsamples\.interactions\.fun_3_False" "css_element"
#     And I press "Submit Answers"
#     Then I should see "Score: 73"

#     When I switch to the main frame
#     And I switch to "scorm_object" iframe
#     And I press "Exit"
#     And I switch to the main frame
#     And I go back in the app
#     Then I should find "73%" within "Grade reported" "ion-item" in the app
#     And I should find "87%" within "Grade for attempt 1" "ion-item" in the app
#     And I should find "27%" within "Grade for attempt 2" "ion-item" in the app
#     And I should find "73%" within "Grade for attempt 3" "ion-item" in the app
