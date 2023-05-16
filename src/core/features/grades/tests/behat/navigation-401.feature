@app @javascript @lms_upto4.1
Feature: Grades navigation

  Background:
    Given the following "users" exist:
      | username  | firstname | lastname |
      | student1  | Student   | first    |
      | student2  | Student   | second    |
      | teacher1  | Teacher   | first   |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 2 | C2        |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
      | student1 | C2     | student |
      | student2 | C2     | student |
      | teacher1 | C2     | editingteacher |
    And the following "grade categories" exist:
      | fullname | course |
      | GC C1    | C1     |
      | GC C2.1  | C2     |
      | GC C2.2  | C2     |
    And the following "grade items" exist:
      | gradecategory | itemname  | grademin | grademax | course |
      | GC C1         | GI C1     | 20       | 40       | C1     |
      | GC C2.1       | GI C2.1.1 | 60       | 80       | C2     |
      | GC C2.1       | GI C2.1.2 | 10       | 90       | C2     |
      | GC C2.2       | GI C2.2.1 | 0        | 100      | C2     |
    And the following "grade grades" exist:
      | gradeitem | user     | grade |
      | GI C1     | student1 | 30    |
      | GI C2.1.1 | student1 | 70    |
      | GI C2.1.2 | student1 | 20    |
      | GI C2.2.1 | student1 | 40    |

  # This scenario is duplicated from main because teacher gradebook is not supported
  # in 4.1. It tests the grades from participants profile instead.
  Scenario: Mobile navigation (teacher)
    Given I entered the course "Course 2" as "teacher1" in the app

    # Course grades
    When I press "Participants" in the app
    And I press "Student first" in the app
    And I press "Grades" in the app
    Then I should find "GC C2.1" in the app
    And I should find "70" within "GI C2.1.1" "tr" in the app
    And I should find "20" within "GI C2.1.2" "tr" in the app
    And I should find "90" within "GC C2.1 total" "tr" in the app
    And I should find "GC C2.2" in the app
    And I should find "40" within "GI C2.2.1" "tr" in the app
    And I should find "40" within "GC C2.2 total" "tr" in the app
    And I should find "130" within "Course total" "tr" in the app
    But I should not find "GC C1" in the app
    And I should not find "GI C1" in the app

    # Course grades details
    When I press "GI C2.1.1" in the app
    Then I should find "Weight" in the app
    And I should find "70.00" within "Grade" "ion-item" in the app
    And I should find "60–80" within "Range" "ion-item" in the app
    And I should find "50.00 %" within "Percentage" "ion-item" in the app
    And I should find "Contribution to course total" in the app
    And I should find "GI C2.1.2" in the app

    When I press "GI C2.1.1" in the app
    Then I should not find "Weight" in the app
    And I should not find "Range" in the app
    And I should not find "Percentage" in the app
    And I should not find "Contribution to course total" in the app
    But I should find "GI C2.1.1" in the app
    And I should find "GI C2.1.2" in the app

    When I press "Course total" in the app
    Then I should find "130" within "Grade" "ion-item" in the app
    And I should find "0–270" within "Range" "ion-item" in the app

    When I press "Course total" in the app
    Then I should not find "Weight" in the app
    And I should not find "Percentage" in the app

  # This scenario is duplicated from main because teacher gradebook is not supported
  # in 4.1. It tests the grades from participants profile instead.
  Scenario: Tablet navigation (teacher)
    Given I entered the course "Course 2" as "teacher1" in the app
    And I change viewport size to "1200x640" in the app

    # Course grades
    When I press "Participants" in the app
    And I press "Student first" in the app
    And I press "Grades" in the app
    Then I should find "GC C2.1" in the app
    And I should find "Weight" in the app
    And I should find "Contribution to course total" in the app
    And I should find "70.00" within "GI C2.1.1" "tr" in the app
    And I should find "60–80" within "GI C2.1.1" "tr" in the app
    And I should find "50.00 %" within "GI C2.1.1" "tr" in the app
    And I should find "20" within "GI C2.1.2" "tr" in the app
    And I should find "90" within "GC C2.1 total" "tr" in the app
    And I should find "GC C2.2" in the app
    And I should find "40" within "GI C2.2.1" "tr" in the app
    And I should find "40" within "GC C2.2 total" "tr" in the app
    And I should find "130" within "Course total" "tr" in the app
