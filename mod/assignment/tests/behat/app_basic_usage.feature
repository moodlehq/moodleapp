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
      | activity | course | idnumber | name                | intro                        | assignsubmission_onlinetext_enabled | duedate | attemptreopenmethod |
      | assign   | C1     | assign1  | assignment1         | Test assignment description1 | 1                                   | 1       | manual              |


  @app @3.8.0 @OK
  Scenario: View assign and add a submission (online text), submit for grading, view own submission or student submission and view list of student submissions (as teacher)
  When I enter the app
  And I log in as "student1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  Then the header should be "Course 1" in the app
  And I press "assignment1" in the app
  Then the header should be "assignment1" in the app
  And I should see "Test assignment description1"
  And I should see "Due date"
  And I should see "Thursday, 1 January 1970, 1:00 AM"
  And I press "Add submission" in the app
  And I set the field "Online text submissions" to "Submission test" in the app
  And I press "Save" in the app
  Then I should see "Draft (not submitted)"
  And I should see "Not graded"
  And I press "Edit submission" in the app
  And I set the field "Online text submissions" to "Submission test edited" in the app
  And I press "Save" in the app
  And I press "OK" in the app
  And I press "Submit assignment" in the app
  And I press "OK" in the app
  Then I should see "Submitted for grading"
  And I should see "Not graded"
  And I should see "Submission test edited"
  When I enter the app
  And I log in as "teacher1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  Then the header should be "Course 1" in the app
  And I press "assignment1" in the app
  Then the header should be "assignment1" in the app
  And I press "Submitted" in the app
  Then I should see "Student student"
  And I should see "Not graded"
  And I press "Student student" near "assignment1" in the app
  Then I should see "Online text submission"
  And I should see "Submission test edited"

  @app @3.8.0 @OK
  Scenario: Add new attempt from previous submission
  When I enter the app
  And I log in as "student1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  Then the header should be "Course 1" in the app
  And I press "assignment1" in the app
  Then the header should be "assignment1" in the app
  And I should see "Test assignment description1"
  And I should see "Due date"
  And I should see "Thursday, 1 January 1970, 1:00 AM"
  And I press "Add submission" in the app
  And I set the field "Online text submissions" to "Submission test" in the app
  And I press "Save" in the app
  And I press "Submit assignment" in the app
  And I press "OK" in the app
  When I enter the app
  And I log in as "teacher1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  Then the header should be "Course 1" in the app
  And I press "assignment1" in the app
  Then the header should be "assignment1" in the app
  And I press "Participants" in the app
  Then I should see "Student student"
  And I should see "Not graded"
  And I press "Student student" near "assignment1" in the app
  Then I should see "Online text submission"
  And I should see "Submission test"
  And I press "Grade" in the app
  And I press "Allow another attempt" in the app
  And I press "Done"
  Then I should see "Reopened"
  And I should see "Not graded"
  When I enter the app
  And I log in as "student1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  Then the header should be "Course 1" in the app
  And I press "assignment1" in the app
  And I should see "Reopened"
  And I should see "2 out of Unlimited"
  And I should see "Add a new attempt based on previous submission"
  And I should see "Add a new attempt"
  And I press "Add a new attempt based on previous submission" in the app
  And I press "OK" in the app
  Then I should see "Submission test"
  And I set the field "Online text submissions" to "Submission test 2 attempt" in the app
  And I press "Save" in the app
  And I press "OK" in the app
  And I press "Submit assignment" in the app
  And I press "OK" in the app
  When I enter the app
  And I log in as "teacher1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  Then the header should be "Course 1" in the app
  And I press "assignment1" in the app
  Then the header should be "assignment1" in the app
  And I press "Participants" in the app
  Then I should see "Student student"
  And I should see "Not graded"
  And I press "Student student" near "assignment1" in the app
  Then I should see "Online text submission"
  And I should see "Submission test 2 attempt"