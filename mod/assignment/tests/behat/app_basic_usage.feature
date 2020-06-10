@mod @mod_assign @app @javascript
Feature: Test basic usage of assignment activity in app
  In order to participate in the assignment while using the mobile app
  I need basic assignment functionality to work

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email |
      | teacher1 | Teacher | teacher | teacher1@example.com |
      | student1 | Student | student | student1@example.com |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1 | 0 |
    And the following "course enrolments" exist:
      | user | course | role |
      | teacher1 | C1 | editingteacher |
      | student1 | C1 | student |
    And the following "activities" exist:
      | activity | course | idnumber | name                | intro                        | assignsubmission_onlinetext_enabled | duedate    | attemptreopenmethod |
      | assign   | C1     | assign1  | assignment1         | Test assignment description1 | 1                                   | 1029844800 | manual              |

  @app @3.8.0
  Scenario: Create, edit and submit an assignment as a student, view it as a teacher
    # Create, edit and submit as a student
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Recently accessed courses" in the app
    And I press "assignment1" in the app
    Then the header should be "assignment1" in the app
    And I should see "Test assignment description1"
    And I should see "Due date"
    And I should see "Tuesday, 20 August 2002, 12:00 PM"

    When I press "Add submission" in the app
    And I set the field "Online text submissions" to "Submission test" in the app
    And I press "Save" in the app
    Then I should see "Draft (not submitted)"
    And I should see "Not graded"

    When I press "Edit submission" in the app
    And I set the field "Online text submissions" to "Submission test edited" in the app
    And I press "Save" in the app
    And I press "OK" in the app
    Then I should see "Submission test edited"

    When I press "Submit assignment" in the app
    And I press "OK" in the app
    Then I should see "Submitted for grading"
    And I should see "Not graded"
    And I should see "Submission test edited"

    # View as a teacher
    When I enter the app
    And I log in as "teacher1"
    And I press "Course 1" near "Recently accessed courses" in the app
    And I press "assignment1" in the app
    Then the header should be "assignment1" in the app

    When I press "Submitted" in the app
    Then I should see "Student student"
    And I should see "Not graded"

    When I press "Student student" near "assignment1" in the app
    Then I should see "Online text submissions"
    And I should see "Submission test edited"

  @app @3.8.0
  Scenario: Add new attempt from previous submission
    # Submit first attempt as a student
    Given I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Recently accessed courses" in the app
    And I press "assignment1" in the app
    And I press "Add submission" in the app
    And I set the field "Online text submissions" to "Submission test 1st attempt" in the app
    And I press "Save" in the app
    And I press "Submit assignment" in the app
    And I press "OK" in the app

    # Allow more attempts as a teacher
    When I enter the app
    And I log in as "teacher1"
    And I press "Course 1" near "Recently accessed courses" in the app
    And I press "assignment1" in the app
    And I press "Participants" in the app
    And I press "Student student" near "assignment1" in the app
    And I press "Grade" in the app
    And I press "Allow another attempt" in the app
    And I press "Done"
    Then I should see "Reopened"
    And I should see "Not graded"

    # Submit second attempt as a student
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Recently accessed courses" in the app
    And I press "assignment1" in the app
    Then I should see "Reopened"
    And I should see "2 out of Unlimited"
    And I should see "Add a new attempt based on previous submission"
    And I should see "Add a new attempt"

    When I press "Add a new attempt based on previous submission" in the app
    And I press "OK" in the app
    Then I should see "Submission test 1st attempt"

    When I set the field "Online text submissions" to "Submission test 2nd attempt" in the app
    And I press "Save" in the app
    And I press "OK" in the app
    And I press "Submit assignment" in the app
    And I press "OK" in the app

    # View second attempt as a teacher
    When I enter the app
    And I log in as "teacher1"
    And I press "Course 1" near "Recently accessed courses" in the app
    And I press "assignment1" in the app
    And I press "Participants" in the app
    And I press "Student student" near "assignment1" in the app
    Then I should see "Online text submissions"
    And I should see "Submission test 2nd attempt"

  @app @3.8.0
  Scenario: Add offline submission and synchronise it
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Recently accessed courses" in the app
    And I press "assignment1" in the app
    And I press "Add submission" in the app
    And I switch offline mode to "true"
    And I set the field "Online text submissions" to "Submission test" in the app
    And I press "Save" in the app
    And I press "Submit assignment" in the app
    And I press "OK" in the app
    Then I should see "This Assignment has offline data to be synchronised."

    When I switch offline mode to "false"
    And I press the back button in the app
    And I press "assignment1" in the app
    And I press "Display options" in the app
    And I press "Refresh" in the app
    Then I should see "Submitted for grading"
    But I should not see "This Assignment has offline data to be synchronised."

  @app @3.8.0
  Scenario: Edit an offline submission before synchronising it
    When I enter the app
    And I log in as "student1"
    And I press "Course 1" near "Recently accessed courses" in the app
    And I press "assignment1" in the app
    And I press "Add submission" in the app
    And I switch offline mode to "true"
    And I set the field "Online text submissions" to "Submission test original offline" in the app
    And I press "Save" in the app
    Then I should see "This Assignment has offline data to be synchronised."
    And I should see "Submission test original offline"

    When I press "Edit submission" in the app
    And I set the field "Online text submissions" to "Submission test edited offline" in the app
    And I press "Save" in the app
    Then I should see "This Assignment has offline data to be synchronised."
    And I should see "Submission test edited offline"
    But I should not see "Submission test original offline"

    When I press "Submit assignment" in the app
    And I press "OK" in the app
    Then I should see "This Assignment has offline data to be synchronised."

    When I switch offline mode to "false"
    And I press the back button in the app
    And I press "assignment1" in the app
    Then I should see "Submitted for grading"
    And I should see "Submission test edited offline"
    But I should not see "This Assignment has offline data to be synchronised."
