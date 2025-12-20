@app_parallel_run_enrol @core_course @app @enrol @enrol_guest @javascript
Feature: Test basic usage of guest access course in app

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
      | username | firstname | lastname | email |
      | teacher1 | Teacher | teacher | teacher1@example.com |
      | student1 | Student | student | student1@example.com |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1 | 0 |
    And the following "course enrolments" exist:
      | user | course | role |
      | teacher1 | C1 | editingteacher |
    And the following "activities" exist:
      | activity | course | idnumber | name                | intro                       | assignsubmission_onlinetext_enabled | section |
      | assign   | C1     | assign1  | assignment          | Test assignment description | 1                                   | 1       |
    And the following "activities" exist:
      | activity    | name             | intro        | course | idnumber  | groupmode |
      | wiki        | Test wiki name   | Test wiki    | C1     | wiki      | 0         |

  Scenario: Guest access without password (student)
    Given I am on the "Course 1" "enrolment methods" page logged in as "teacher1"
    And I click on "Edit" "link" in the "Guest access" "table_row"
    And I set the following fields to these values:
      | Allow guest access | Yes |
    And I press "Save changes"
    And I entered the app as "student1"

    When I press "Site home" in the app
    And I press "Available courses" in the app
    And I press "Course 1" in the app
    Then I should find "Course summary" in the app
    And I should find "Course" in the app

    When I press "View course" "ion-button" in the app
    Then the header should be "Course 1" in the app
    And I should find "assignment" in the app
    And I should find "Test wiki name" in the app

    When I press "assignment" in the app
    Then I should not find "Add submission" in the app

  @lms_from4.3
  Scenario: Guest access with password (student)
    Given I am on the "Course 1" "enrolment methods" page logged in as "teacher1"
    And I click on "Edit" "link" in the "Guest access" "table_row"
    And I set the following fields to these values:
      | Allow guest access | Yes |
      | Password | moodle_rules |
    And I press "Save changes"
    And I entered the app as "student1"

    When I press "Site home" in the app
    And I press "Available courses" in the app
    And I press "Course 1" in the app
    Then I should find "Course summary" in the app
    And I should find "Course" in the app

    When I press "View course" "ion-button" in the app
    And I set the following fields to these values in the app:
      | Password | wrong |
    And I press "Submit" "ion-button" in the app
    Then I should find "Incorrect access password, please try again" in the app

    # Show the hint.
    Given the following config values are set as admin:
      | showhint | 1 | enrol_guest |
    When I press "Submit" "ion-button" in the app
    Then I should find "That access password was incorrect, please try again" in the app
    When I set the following fields to these values in the app:
      | Password | moodle_rules |
    And I press "Submit" "ion-button" in the app
    Then the header should be "Course 1" in the app
    And I should find "assignment" in the app
    And I should find "Test wiki name" in the app

    When I press "assignment" in the app
    Then I should not find "Add submission" in the app
