
@core_grades @app @core @javascript @test
Feature: We don't show hidden grades for users without the 'moodle/grade:viewhidden' capability on user report
  In order to show user report in secure way
  As a teacher without the 'moodle/grade:viewhidden' capability
  I should not see hidden grades in the user report

  Background:
    Given the following "courses" exist:
      | fullname | shortname | format |
      | Course 1 | C1        | topics |
    And the following "users" exist:
      | username | firstname | lastname | email                |
      | teacher1 | Teacher   | 1        | teacher1@example.com |
      | student1 | Student1   | 1        | student1@example.com |
      | student2 | Student2   | 2        | student2@example.com |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | teacher1 | C1     | editingteacher |
      | student1 | C1     | student        |
      | student2 | C1     | student        |
    And the following "activities" exist:
      | activity | course | section | name                   | intro                   | assignsubmission_onlinetext_enabled | submissiondrafts |
      | assign   | C1     | 1       | Test assignment name 1 | Submit your online text | 1                                   | 0                |
      | assign   | C1     | 1       | Test assignment name 2 | submit your online text | 1                                   | 0                |
      | assign   | C1     | 1       | Test assignment name 3 | submit your online text | 1                                   | 0                |
    # Hidden manual grade item.
    And the following "grade items" exist:
      | itemname     | grademin | grademax | course | hidden |
      | Manual grade | 20       | 40       | C1     | 1      |
    And the following "grade grades" exist:
      | gradeitem              | user     | grade |
      | Test assignment name 1 | student1 | 80    |
      | Test assignment name 1 | student2 | 70    |
      | Test assignment name 2 | student1 | 90    |
      | Test assignment name 2 | student2 | 60    |
      | Test assignment name 3 | student1 | 10    |
      | Test assignment name 3 | student2 | 50    |
      | Manual grade           | student1 | 30    |
      | Manual grade           | student2 | 40    |
    And I log in as "admin"
    # Need to show hidden items in order to check hidden grades. Also lets show totals if they contain hidden items.
    And the following config values are set as admin:
      | grade_report_user_showhiddenitems           | 2 |
      | grade_report_user_showtotalsifcontainhidden | 2 |
    And I am on "Course 1" course homepage with editing mode on
    # Hide assignment 2 activity.
    And I open "Test assignment name 2" actions menu
    And I choose "Hide" in the open action menu
    And I navigate to "View > Grader report" in the course gradebook
    # Hide grade.
    And I click on grade menu "Test assignment name 1" for user "student1"
    And I choose "Hide" in the open action menu
    # Hide assignment 3 grade item.
    And I set the following settings for grade item "Test assignment name 3" of type "gradeitem" on "grader" page:
      | Hidden          | 1 |

  Scenario: View user report containing hidden activities or grade items or grades with capabilities with student view
    Given I entered the course "Course 1" as "teacher1" in the app
    When I press "Grades" in the app
    And I press "Student1 1" in the app

    # Student View.
    And I should find "-" within "Test assignment name 1" "tr" in the app
    And I should find "-" within "Test assignment name 3" "tr" in the app
    And I should find "-" within "Manual grade" "tr" in the app
    And I should find "210" within "Course total" "tr" in the app
    And I should not find "Test assignment name 2" in the app

    And I go back in the app
    And I press "Student2 2" in the app
    And I should find "70" within "Test assignment name 1" "tr" in the app
    And I should find "-" within "Test assignment name 3" "tr" in the app
    And I should find "-" within "Manual grade" "tr" in the app
    And I should find "220" within "Course total" "tr" in the app
    And I should not find "Test assignment name 2" in the app

  Scenario: View user report containing hidden activities or grade items or grades without capabilities with student view
    Given the following "role capability" exists:
      | role                    | editingteacher  |
      | moodle/grade:viewhidden | prohibit        |
    And I entered the course "Course 1" as "teacher1" in the app
    When I press "Grades" in the app
    And I press "Student2 2" in the app

    And I should find "-" within "Test assignment name 1" "tr" in the app
    And I should find "-" within "Test assignment name 3" "tr" in the app
    And I should find "-" within "Manual grade" "tr" in the app
    And I should find "210" within "Course total" "tr" in the app
    And I should not find "Test assignment name 2" in the app

    And I go back in the app
    And I press "Student1 1" in the app

    And I should find "-" within "Test assignment name 1" "tr" in the app
    And I should find "-" within "Test assignment name 3" "tr" in the app
    And I should find "-" within "Manual grade" "tr" in the app
    And I should find "210" within "Course total" "tr" in the app
    And I should not find "Test assignment name 2" in the app
