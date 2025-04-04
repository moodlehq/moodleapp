@addon_block_selfcompletion @app @block @block_selfcompletion @javascript
Feature: View the self completion block and check
    it links to the correct page

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email | idnumber |
      | teacher1 | Teacher | 1 | teacher1@example.com | T1 |
      | student1 | Student | 1 | student1@example.com | S1 |
    And the following "courses" exist:
      | fullname | shortname | category | enablecompletion |
      | Course 1 | C1        | 0        | 1                |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | teacher1 | C1     | editingteacher |
      | student1 | C1     | student        |
    And I enable "selfcompletion" "block" plugin
    And the following "activities" exist:
      | activity   | course | idnumber   | name             | gradepass | completion   | completionview | completionusegrade | completionpassgrade |
      | page       | C1     | page1      | Test page name   |           | 2            | 1              | 0                  | 0                   |
      | assign     | C1     | assign1    | Test assign name | 50        | 2            | 0              | 1                  | 1                   |
    And the following "blocks" exist:
      | blockname      | contextlevel | reference | pagetypepattern | defaultregion |
      | selfcompletion | Course       | C1        | course-view-*   | side-pre      |
    And I am on the "Course 1" course page logged in as teacher1
    And I navigate to "Course completion" in current page administration
    And I expand all fieldsets
    And I set the following fields to these values:
      | id_criteria_self | 1 |
    And I press "Save changes"

  Scenario: View and navigate the self completion block in a course
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Open block drawer" in the app
    Then I should find "Self completion" in the app
    When I press "Self completion" in the app
    Then the header should be "Course completion" in the app
    And I should find "Student 1" in the app
