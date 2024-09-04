@addon_mod_scorm @app @javascript
Feature: Test availability options of SCORM activity in app
  Only open SCORMs should be allowed to be played

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
    And the following "activities" exist:
      | activity | course | name          | packagefilepath                                | timeopen      | timeclose     |
      | scorm    | C1     | Past SCORM    | mod/scorm/tests/packages/singlesco_scorm12.zip | ##-2 days##   | ##yesterday## |
      | scorm    | C1     | Current SCORM | mod/scorm/tests/packages/singlesco_scorm12.zip | ##yesterday## | ##tomorrow##  |
      | scorm    | C1     | Future SCORM  | mod/scorm/tests/packages/singlesco_scorm12.zip | ##tomorrow##  | ##+2 days##   |

  Scenario: Only open SCORMs can be played
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Past SCORM" in the app
    Then I should find "Sorry, this activity closed on ## yesterday ##%A, %d %B %Y, %I:%M %p## and is no longer available" in the app
    And I should find "## -2 days ##%d %B %Y, %I:%M %p##" near "Opened:" in the app
    And I should find "## yesterday ##%d %B %Y, %I:%M %p##" near "Closed:" in the app
    And I should not be able to press "Enter" in the app

    When I go back in the app
    And I press "Current SCORM" in the app
    Then I should find "## yesterday ##%d %B %Y, %I:%M %p##" near "Opened:" in the app
    And I should find "## tomorrow ##%d %B %Y, %I:%M %p##" near "Closes:" in the app
    And I should be able to press "Enter" in the app

    When I go back in the app
    And I press "Future SCORM" in the app
    Then I should find "Sorry, this activity is not available until ## tomorrow ##%A, %d %B %Y, %I:%M %p##" in the app
    And I should find "## tomorrow ##%d %B %Y, %I:%M %p##" near "Opens:" in the app
    And I should find "## +2days ##%d %B %Y, %I:%M %p##" near "Closes:" in the app
    And I should not be able to press "Enter" in the app
