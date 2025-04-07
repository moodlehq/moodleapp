@addon_coursecompletion @app @block @block_completionstatus @block_selfcompletion @javascript
Feature: Student should be able to complete a course with self completion enabled.

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
    And I am on the "Course 1" course page logged in as teacher1
    And I navigate to "Course completion" in current page administration
    And I expand all fieldsets
    And I set the following fields to these values:
      | id_criteria_self | 1 |
    And I press "Save changes"

  Scenario: Manually complete the course
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Completion" in the app
    Then I should find "Not yet started" within "Status" "ion-item" in the app
    And I should find "Marking yourself complete" in the app
    And I should find "No" within "Self completion" "ion-item" in the app
    And I should find "Manual self completion" in the app
    When I press "Complete course" in the app
    Then I should find "Confirm self completion" in the app
    When I press "Yes" in the app
    Then I should find "In progress" within "Status" "ion-item" in the app
    # Running completion task just after clicking sometimes fail, as record
    # should be created before the task runs.
    When I wait "1" seconds
    And I run the scheduled task "core\task\completion_regular_task"
    And I pull to refresh in the app
    Then I should find "Complete" within "Status" "ion-item" in the app
    And I should find "Yes" within "Self completion" "ion-item" in the app
