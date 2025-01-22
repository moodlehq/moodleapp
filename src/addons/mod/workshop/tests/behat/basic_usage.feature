@addon_mod_workshop @app @mod @mod_workshop @javascript
Feature: Test basic usage of workshop activity in app

  Background:
    Given the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "users" exist:
      | username | firstname | lastname |
      | student1 | First     | Student  |
      | student2 | Second    | Student  |
      | teacher1 | First     | Teacher  |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
      | student2 | C1     | student |
      | teacher1 | C1     | editingteacher |
    And the following "activities" exist:
      | activity   | name          | intro                 | course | idnumber |
      | workshop   | Test workshop | Workshop description  | C1     | workshop |

  Scenario: Take a workshop

    # Setup phase
    Given I entered the workshop activity "workshop" on course "Course 1" as "teacher1" in the app
    Then I should find "Setup phase" in the app
    And I should find "Task done" within "Provide instructions for submission" "ion-item" in the app
    And I should find "Task done" within "Set the workshop description" "ion-item" in the app
    And I should find "Task to do" within "Edit assessment form" "ion-item" in the app
    And I should find "Task to do" within "Switch to the next phase" "ion-item" in the app

    When I press "Edit assessment form" in the app
    And I press "OK" in the app
    And I switch to the browser tab opened by the app
    And I log in as "teacher1"
    And I set the field "id_description__idx_0_editor" to "Was the submission good?"
    And I press "Save and close"
    And I change phase in workshop "Test workshop" to "Submission phase"
    And I close the browser tab opened by the app
    And I pull to refresh in the app
    Then I should find "Submission phase" in the app
    And I should find "Task done" within "Provide instructions for assessment" "ion-item" in the app
    And I should find "Task to do" within "Allocate submissions" "ion-item" in the app
    And I should find "expected: 2" within "Allocate submissions" "ion-item" in the app
    And I should find "submitted: 0" within "Allocate submissions" "ion-item" in the app
    And I should find "to allocate: 0" within "Allocate submissions" "ion-item" in the app

    # Submission phase
    Given I entered the workshop activity "workshop" on course "Course 1" as "student1" in the app
    Then I should find "Task to do" within "Submit your work" "ion-item" in the app

    When I press "Add submission" in the app
    And I set the field "Title" to "The Answer" in the app
    And I set the field "Submission content" to "42" in the app
    And I press "Save" in the app
    Then I should find "Task done" within "Submit your work" "ion-item" in the app
    And I should find "The Answer" in the app
    And I should find "42" in the app
    And I should find "Edit submission" in the app

    Given I entered the workshop activity "workshop" on course "Course 1" as "teacher1" in the app
    When I pull to refresh in the app
    Then I should find "Submission phase" in the app
    And I should find "Task done" within "Provide instructions for assessment" "ion-item" in the app
    And I should find "Task to do" within "Allocate submissions" "ion-item" in the app
    And I should find "expected: 2" within "Allocate submissions" "ion-item" in the app
    And I should find "submitted: 1" within "Allocate submissions" "ion-item" in the app
    And I should find "to allocate: 1" within "Allocate submissions" "ion-item" in the app

    When I press "Allocate submissions" in the app
    And I press "OK" in the app
    And I switch to the browser tab opened by the app
    And I allocate submissions in workshop "Test workshop" as:
      | Participant   | Reviewer       |
      | First Student | Second Student |
    And I change phase in workshop "Test workshop" to "Assessment phase"
    And I close the browser tab opened by the app
    And I pull to refresh in the app
    Then I should find "Assessment phase" in the app

    # Assessment phase
    Given I entered the workshop activity "workshop" on course "Course 1" as "student2" in the app
    Then I should find "Task to do" within "Assess peers" "ion-item" in the app

    When I press "The Answer" in the app
    And I press "Grade for Aspect 1" in the app
    And I press "10 / 10" in the app
    And I press "Save" in the app
    Then I should find "Assessed submission" in the app

    # Grading evaluation phase
    Given I entered the workshop activity "workshop" on course "Course 1" as "teacher1" in the app
    And I press "Switch to the next phase" in the app
    And I press "OK" in the app
    And I switch to the browser tab opened by the app
    And I press "Continue"
    Then I should see "Grading evaluation phase"

    When I press "Re-calculate grades"
    Then I should see "calculated: 1"

    When I close the browser tab opened by the app
    And I pull to refresh in the app
    Then I should find "Grading evaluation phase" in the app

    # Closed
    When I press "Switch to the next phase" in the app
    And I press "OK" in the app
    And I switch to the browser tab opened by the app
    And I press "Continue"
    Then I should see "Closed"

    When I close the browser tab opened by the app
    And I pull to refresh in the app
    Then I should find "Closed" in the app
    And I should find "Conclusion 1" in the app
    And the following events should have been logged for "student1" in the app:
      | name                                     | activity | activityname  | course   |
      | \mod_workshop\event\course_module_viewed | workshop | Test workshop | Course 1 |
      | \mod_workshop\event\submission_created   | workshop | Test workshop | Course 1 |
      | \mod_workshop\event\submission_updated   | workshop | Test workshop | Course 1 |
      | \mod_workshop\event\assessable_uploaded  | workshop | Test workshop | Course 1 |
    And the following events should have been logged for "student2" in the app:
      | name                                     | activity | activityname  | relateduser | course   |
      | \mod_workshop\event\course_module_viewed | workshop | Test workshop |             | Course 1 |
      | \mod_workshop\event\submission_viewed    | workshop | Test workshop | student1    | Course 1 |
      | \mod_workshop\event\submission_assessed  | workshop | Test workshop | student1    | Course 1 |
    And the following events should have been logged for "teacher1" in the app:
      | name                                     | activity | activityname  | course   |
      | \mod_workshop\event\course_module_viewed | workshop | Test workshop | Course 1 |

  Scenario: Prefetch a workshop
    Given I entered the course "Course 1" as "teacher1" in the app
    And I press "workshop" in the app
    When I press "Information" in the app
    And I press "Download" in the app
    And I press "Close" in the app
    And I go back in the app
    Then I should find "Downloaded" in the app
