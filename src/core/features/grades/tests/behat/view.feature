@core_grades @app @core @javascript
Feature: View grades

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
      | username  | firstname | lastname |
      | student1  | Student   | first    |
    And the following "scales" exist:
      | name  | scale     |
      | Scale | Good, Bad |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
    And the following "grade categories" exist:
      | fullname   | course |
      | Category 1 | C1     |
      | Category 2 | C1     |
    And the following "grade outcomes" exist:
      | fullname | shortname | course | scale |
      | Outcome  | outcome   | C1     | Scale |
    And the following "grade items" exist:
      | gradecategory | itemname  | course | grademin | grademax |
      | Category 1    | Item 1.1  | C1     | 60       | 80       |
      | Category 1    | Item 1.2  | C1     | 10       | 90       |
      | Category 2    | Item 2.1  | C1     | 0        | 100      |
    And the following "activities" exist:
      | gradecategory | name         | course | activity | idnumber | grade | gradepass |
      | Category 1    | Assignment 1 | C1     | assign   | assign1  | 100   | 50        |
      | Category 1    | Assignment 2 | C1     | assign   | assign2  | 100   | 50        |
    And the following "grade items" exist:
      | gradecategory | itemname | course | outcome |
      | Category 1    | Outcome  | C1     | outcome |
    And the following "grade grades" exist:
      | gradeitem    | user     | grade |
      | Item 1.1     | student1 | 70    |
      | Item 1.2     | student1 | 20    |
      | Item 2.1     | student1 | 40    |
      | Assignment 1 | student1 | 80    |
      | Assignment 2 | student1 | 35    |
      | Outcome      | student1 | 1     |
    And the following config values are set as admin:
      | enableoutcomes | 1 |

  Scenario: View individual grades and the grade report
    Given I entered the course "Course 1" as "student1" in the app

    When I press "Assignment 1" in the app
    And I press "Information" in the app
    Then I should find "80" within "Gradebook" "ion-list" in the app

    When I press "Close" in the app
    And I go back in the app
    And I press "Assignment 2" in the app
    And I press "Information" in the app
    Then I should find "35" within "Gradebook" "ion-list" in the app

    When I press "Close" in the app
    And I go back in the app
    And I press "Grades" in the app
    Then I should find "Category 1" in the app
    And I should find "70" within "Item 1.1" "tr" in the app
    And I should find "20" within "Item 1.2" "tr" in the app
    And I should find "80" within "Assignment 1" "tr" in the app
    And I should find "Pass" within "Assignment 1" "tr" in the app
    And I should find "35" within "Assignment 2" "tr" in the app
    And I should find "Fail" within "Assignment 2" "tr" in the app
    And I should find "Good" within "Outcome" "tr" in the app
    And I should find "205" within "Category 1 total" "tr" in the app
    And I should find "Category 2" in the app
    And I should find "40" within "Item 2.1" "tr" in the app
    And I should find "40" within "Category 2 total" "tr" in the app
    And I should find "245" within "Course total" "tr" in the app
