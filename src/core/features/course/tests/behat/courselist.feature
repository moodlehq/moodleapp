@core_course @app @core @core_my @block_myoverview @javascript
Feature: Test course list shown on app start tab
  In order to select a course
  As a student
  I need to see the correct list of courses

  Background:
    Given the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
      | Course 2 | C2        |
    And the following "users" exist:
      | username |
      | student1 |
      | student2 |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
      | student2 | C1     | student |
      | student2 | C2     | student |

  Scenario: View courses (shortnames not displayed)
    Given I entered the app as "student1"
    When I press "My courses" in the app
    Then I should find "Course 1" in the app
    But I should not find "Course 2" in the app
    But I should not find "C1" in the app
    But I should not find "C2" in the app

    Given I entered the app as "student2"
    When I press "My courses" in the app
    Then I should find "Course 1" in the app
    And I should find "Course 2" in the app
    But I should not find "C1" in the app
    But I should not find "C2" in the app

  Scenario: Filter courses
    Given the following config values are set as admin:
      | courselistshortnames | 1 |
    And the following "courses" exist:
      | fullname | shortname |
      | Frog 3   | C3        |
      | Frog 4   | C4        |
      | Course 5 | C5        |
      | Toad 6   | C6        |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student2 | C3     | student |
      | student2 | C4     | student |
      | student2 | C5     | student |
      | student2 | C6     | student |
    # Create bogus courses so that the main ones aren't shown in the 'recently accessed' part.
    # Because these come later in alphabetical order, they may not be displayed in the lower part
    # which is OK.
    And the following "courses" exist:
      | fullname | shortname |
      | Zogus 1  | Z1        |
      | Zogus 2  | Z2        |
      | Zogus 3  | Z3        |
      | Zogus 4  | Z4        |
      | Zogus 5  | Z5        |
      | Zogus 6  | Z6        |
      | Zogus 7  | Z7        |
      | Zogus 8  | Z8        |
      | Zogus 9  | Z9        |
      | Zogus 10 | Z10       |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student2 | Z1     | student |
      | student2 | Z2     | student |
      | student2 | Z3     | student |
      | student2 | Z4     | student |
      | student2 | Z5     | student |
      | student2 | Z6     | student |
      | student2 | Z7     | student |
      | student2 | Z8     | student |
      | student2 | Z9     | student |
      | student2 | Z10    | student |
    Given I entered the app as "student2"
    When I press "My courses" in the app
    Then I should find "C1" in the app
    And I should find "C2" in the app
    And I should find "C3" in the app
    And I should find "C4" in the app
    And I should find "C5" in the app
    And I should find "C6" in the app
    And I should find "Course 1" in the app
    And I should find "Course 2" in the app
    And I should find "Frog 3" in the app
    And I should find "Frog 4" in the app
    And I should find "Course 5" in the app
    And I should find "Toad 6" in the app

    And I set the field "search text" to "fr" in the app

    Then I should find "C3" in the app
    And I should find "C4" in the app
    And I should find "Frog 3" in the app
    And I should find "Frog 4" in the app
    But I should not find "C1" in the app
    And I should not find "C2" in the app
    And I should not find "C5" in the app
    And I should not find "C6" in the app
    And I should not find "Course 1" in the app
    And I should not find "Course 2" in the app
    And I should not find "Course 5" in the app
    And I should not find "Toad 6" in the app

    When I set the field "search text" to "" in the app
    Then I should find "C1" in the app
    And I should find "C2" in the app
    And I should find "C3" in the app
    And I should find "C4" in the app
    And I should find "C5" in the app
    And I should find "C6" in the app
    And I should find "Course 1" in the app
    And I should find "Course 2" in the app
    And I should find "Frog 3" in the app
    And I should find "Frog 4" in the app
    And I should find "Course 5" in the app
    And I should find "Toad 6" in the app
