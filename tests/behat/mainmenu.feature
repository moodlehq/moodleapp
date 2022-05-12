@app @javascript
Feature: Main Menu opens the right page

  Background:
    Given the following "users" exist:
      | username |
      | student  |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user    | course | role    |
      | student | C1     | student |

  Scenario: Opens Site Home when defaulthomepage is set to Site
    Given the following config values are set as admin:
      | defaulthomepage | 0 |
    When I enter the app
    And I log in as "student"
    Then "Site home" should be selected in the app
    And I should find "Available courses" in the app
    And "Site home" "text" should appear before "Dashboard" "text" in the ".core-tabs-bar" "css_element"
    And "Home" "text" should appear before "My courses" "text" in the ".mainmenu-tabs" "css_element"

  Scenario: Opens Dashboard when defaulthomepage is set to Dashboard
    Given the following config values are set as admin:
      | defaulthomepage | 1 |
    When I enter the app
    And I log in as "student"
    Then "Dashboard" should be selected in the app
    And I should find "Timeline" in the app
    And "Dashboard" "text" should appear before "Site home" "text" in the ".core-tabs-bar" "css_element"
    And "Home" "text" should appear before "My courses" "text" in the ".mainmenu-tabs" "css_element"

  Scenario: Opens My Courses when defaulthomepage is set to My Courses
    Given the following config values are set as admin:
      | defaulthomepage | 3 |
    When I enter the app
    And I log in as "student"
    Then "My courses" near "Home" should be selected in the app
    And I should find "Course 1" in the app
    And "My courses" "text" should appear before "Home" "text" in the ".mainmenu-tabs" "css_element"
