@addon_mod_scorm @app @mod @mod_scorm @javascript
Feature: Test appearance options of SCORM activity in app
  In order to play a SCORM while using the mobile app
  As a student
  I need appearance options to be applied properly

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

  Scenario: Apply width and height when using New window mode
    Given the following "activities" exist:
      | activity | name                  | course | idnumber | packagefilepath                                               | popup | width | height |
      | scorm    | Current window SCORM  | C1     | scorm    | mod/scorm/tests/packages/RuntimeMinimumCalls_SCORM12-mini.zip | 0     | 300   | 300    |
      | scorm    | New window px SCORM   | C1     | scorm2   | mod/scorm/tests/packages/RuntimeMinimumCalls_SCORM12-mini.zip | 1     | 300   | 300    |
      | scorm    | New window perc SCORM | C1     | scorm3   | mod/scorm/tests/packages/RuntimeMinimumCalls_SCORM12-mini.zip | 1     | 50%   | 60%    |
    And I entered the course "Course 1" as "student1" in the app
    And I change viewport size to "1200x640" in the app
    When I press "Current window SCORM" in the app
    And I press "Enter" in the app
    And I press "Disable fullscreen" in the app
    # Then the UI should match the snapshot

    When I go back 2 times in the app
    And I press "New window px SCORM" in the app
    And I press "Enter" in the app
    And I press "Disable fullscreen" in the app
    # Then the UI should match the snapshot

    # SCORMs with percentage sizes are displayed with full size in the app. See MOBILE-3426 for details.
    When I go back 2 times in the app
    And I press "New window perc SCORM" in the app
    And I press "Enter" in the app
    And I press "Disable fullscreen" in the app
    # Then the UI should match the snapshot

  Scenario: Skip SCORM entry page if needed
    Given the following "activities" exist:
      | activity | name                    | course | idnumber | packagefilepath                                               | skipview |
      | scorm    | No skip SCORM           | C1     | scorm    | mod/scorm/tests/packages/RuntimeMinimumCalls_SCORM12-mini.zip | 0        |
      | scorm    | Skip first access SCORM | C1     | scorm2   | mod/scorm/tests/packages/RuntimeMinimumCalls_SCORM12-mini.zip | 1        |
      | scorm    | Always skip SCORM       | C1     | scorm3   | mod/scorm/tests/packages/RuntimeMinimumCalls_SCORM12-mini.zip | 2        |
    And I entered the course "Course 1" as "student1" in the app
    When I press "No skip SCORM" in the app
    Then I should be able to press "Enter" in the app

    When I go back in the app
    And I press "Skip first access SCORM" in the app
    And I press "Disable fullscreen" in the app
    Then I should find "2 / 11" in the app

    When I go back 2 times in the app
    And I press "Skip first access SCORM" in the app
    Then I should be able to press "Enter" in the app
    And I should not be able to press "Disable fullscreen" in the app
    And I should not find "3 / 11" in the app

    When I go back in the app
    And I press "Always skip SCORM" in the app
    And I press "Disable fullscreen" in the app
    Then I should find "2 / 11" in the app

    When I go back 2 times in the app
    And I press "Always skip SCORM" in the app
    And I press "Disable fullscreen" in the app
    # Then I should find "3 / 11" in the app

  Scenario: Disable preview mode
    Given the following "activities" exist:
      | activity | name                  | course | idnumber | packagefilepath                                               | hidebrowse |
      | scorm    | SCORM without preview | C1     | scorm    | mod/scorm/tests/packages/RuntimeMinimumCalls_SCORM12-mini.zip | 1          |
      | scorm    | SCORM with preview    | C1     | scorm2   | mod/scorm/tests/packages/RuntimeMinimumCalls_SCORM12-mini.zip | 0          |
    And I entered the course "Course 1" as "student1" in the app
    When I press "SCORM without preview" in the app
    Then I should not be able to press "Preview" in the app

    When I go back in the app
    And I press "SCORM with preview" in the app
    Then I should be able to press "Preview" in the app

  Scenario: Display course structure on entry page
    Given the following "activities" exist:
      | activity | name                    | course | idnumber | packagefilepath                                               | displaycoursestructure |
      | scorm    | SCORM without structure | C1     | scorm    | mod/scorm/tests/packages/RuntimeMinimumCalls_SCORM12-mini.zip | 0                      |
      | scorm    | SCORM with structure    | C1     | scorm2   | mod/scorm/tests/packages/RuntimeMinimumCalls_SCORM12-mini.zip | 1                      |
    And I entered the course "Course 1" as "student1" in the app
    When I press "SCORM without structure" in the app
    Then I should not find "Other Scoring Systems" in the app

    When I go back in the app
    And I press "SCORM with structure" in the app
    Then I should find "Other Scoring Systems" in the app

  Scenario: Display course structure in player
    Given the following "activities" exist:
      | activity | name              | course | idnumber | packagefilepath                                               | hidetoc |
      | scorm    | SCORM To the side | C1     | scorm    | mod/scorm/tests/packages/RuntimeMinimumCalls_SCORM12-mini.zip | 0       |
      | scorm    | SCORM Hidden      | C1     | scorm2   | mod/scorm/tests/packages/RuntimeMinimumCalls_SCORM12-mini.zip | 1       |
      | scorm    | SCORM Drop Down   | C1     | scorm3   | mod/scorm/tests/packages/RuntimeMinimumCalls_SCORM12-mini.zip | 2       |
      | scorm    | SCORM Disabled    | C1     | scorm4   | mod/scorm/tests/packages/RuntimeMinimumCalls_SCORM12-mini.zip | 3       |
    # In the app, the TOC is always displayed the same unless it's disabled.
    And I entered the course "Course 1" as "student1" in the app
    When I press "SCORM To the side" in the app
    And I press "Enter" in the app
    And I press "Disable fullscreen" in the app
    And I press "TOC" in the app
    Then I should find "Other Scoring Systems" in the app

    When I press "Close" in the app
    And I go back 2 times in the app
    And I press "SCORM Hidden" in the app
    And I press "Enter" in the app
    And I press "Disable fullscreen" in the app
    And I press "TOC" in the app
    Then I should find "Other Scoring Systems" in the app

    When I press "Close" in the app
    And I go back 2 times in the app
    And I press "SCORM Drop Down" in the app
    And I press "Enter" in the app
    And I press "Disable fullscreen" in the app
    And I press "TOC" in the app
    Then I should find "Other Scoring Systems" in the app

    When I press "Close" in the app
    And I go back 2 times in the app
    And I press "SCORM Disabled" in the app
    And I press "Enter" in the app
    And I press "Disable fullscreen" in the app
    And I should not be able to press "TOC" in the app

  Scenario: Display attempt status
    Given the following "activities" exist:
      | activity | name                    | course | idnumber | packagefilepath                                               | displayattemptstatus |
      | scorm    | SCORM no attempt status | C1     | scorm    | mod/scorm/tests/packages/RuntimeMinimumCalls_SCORM12-mini.zip | 0                    |
      | scorm    | SCORM both att status   | C1     | scorm2   | mod/scorm/tests/packages/RuntimeMinimumCalls_SCORM12-mini.zip | 1                    |
      | scorm    | SCORM dashb att status  | C1     | scorm2   | mod/scorm/tests/packages/RuntimeMinimumCalls_SCORM12-mini.zip | 2                    |
      | scorm    | SCORM entry att status  | C1     | scorm2   | mod/scorm/tests/packages/RuntimeMinimumCalls_SCORM12-mini.zip | 3                    |
    # In the app, the attempt status is always displayed the same unless it's disabled.
    And I entered the course "Course 1" as "student1" in the app
    When I press "SCORM no attempt status" in the app
    Then I should not find "Number of attempts allowed" in the app

    When I go back in the app
    And I press "SCORM both att status" in the app
    Then I should find "Number of attempts allowed" in the app

    When I go back in the app
    And I press "SCORM dashb att status" in the app
    Then I should find "Number of attempts allowed" in the app

    When I go back in the app
    And I press "SCORM entry att status" in the app
    Then I should find "Number of attempts allowed" in the app
