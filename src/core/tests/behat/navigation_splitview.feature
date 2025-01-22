@core_navigation @app @javascript
Feature: It navigates properly in pages with a split-view component.

  Background:
    Given the following "users" exist:
      | username |
      | student1 |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 2 | C2        |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
      | student1 | C2     | student |
    And the following "grade categories" exist:
      | fullname          | course |
      | Grade category C1 | C1     |
      | Grade category C2 | C2     |
    And the following "grade items" exist:
      | gradecategory     | itemname      | grademin | grademax | course |
      | Grade category C1 | Grade item C1 | 20       | 40       | C1     |
      | Grade category C2 | Grade item C2 | 60       | 80       | C2     |

  Scenario: Navigate in grades tab on mobile

    # Open user menu
    Given I entered the app as "student1"
    And I press the user menu button in the app

    # Open grades page
    When I press "Grades" in the app
    Then the header should be "Grades" in the app
    And I should find "Course 1" in the app
    And I should find "Course 2" in the app

    # Open C1 course grades
    When I press "Course 1" in the app
    Then the header should be "Course 1" in the app
    And I should find "Grade category C1" in the app

    # Open C1 grade item
    When I press "Grade item C1" in the app
    Then I should find "20" near "Range" in the app
    And I should find "40" near "Range" in the app

    # Go back to grades page
    When I go back in the app
    Then the header should be "Grades" in the app
    And I should find "Course 1" in the app
    And I should find "Course 2" in the app

    # Open C2 course grades
    When I press "Course 2" in the app
    Then the header should be "Course 2" in the app
    And I should find "Grade category C2" in the app

    # Open C2 grade item
    When I press "Grade item C2" in the app
    Then I should find "60" near "Range" in the app
    And I should find "80" near "Range" in the app

    # Go back to grades page
    When I go back in the app
    Then the header should be "Grades" in the app
    And I should find "Course 1" in the app
    And I should find "Course 2" in the app

    # Go back to main page
    When I go back in the app
    Then I should find "Acceptance test site" in the app
    And I should find "User account" in the app
    But I should not find "Back" in the app

  Scenario: Navigate in grades tab on tablet

    # Open user menu
    Given I entered the app as "student1"
    And I change viewport size to "1200x640" in the app
    And I press the user menu button in the app

    # Open grades page
    When I press "Grades" in the app
    Then the header should be "Grades" in the app
    And I should find "Course 1" in the app
    And I should find "Course 2" in the app
    And I should find "Grade category C1" in the app

    When I replace "/.*/" within "core-user-avatar .userinitials" with "M"
    Then the UI should match the snapshot

    # Open C1 course grades
    When I press "Grade item C1" in the app
    Then I should find "Grade category C1" in the app
    And I should find "20" near "Range" in the app
    And I should find "40" near "Range" in the app

    # Select C2 course
    When I press "Course 2" in the app
    Then "Course 2" should be selected in the app
    And I should find "Grade category C2" in the app

    # Open C2 course grades
    When I press "Grade item C2" in the app
    Then I should find "60" near "Range" in the app
    And I should find "80" near "Range" in the app

    # Go back to main page
    When I go back in the app
    Then I should find "Acceptance test site" in the app
    And I should find "User account" in the app
    But I should not find "Back" in the app
