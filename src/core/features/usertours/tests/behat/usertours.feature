@core_usertours @app @javascript
Feature: User Tours work properly.

  Background:
    Given the following "users" exist:
      | username | firstname | lastname |
      | student1 | Student   | First    |
      | student2 | Student   | Second   |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
      | student2 | C1     | student |
    And the app has the following config:
      | disableUserTours | false |

  Scenario: Acknowledge User Tours
    Given I entered the course "Course 1" as "student1" in the app
    Then I should find "Find your way around" in the app

    When I press "Got it" in the app
    Then I should not find "Find your way around" in the app

    When I press "Participants" in the app
    And I press "Student First" in the app
    Then I should find "Swipe left and right to navigate around" in the app

    When I press "Got it" in the app
    Then I should not find "Swipe left and right to navigate around" in the app

    When I go back in the app
    And I press "Student First" in the app
    Then I should not find "Swipe left and right to navigate around" in the app
