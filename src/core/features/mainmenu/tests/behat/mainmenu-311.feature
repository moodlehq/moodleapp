@app @javascript @lms_upto3.11
Feature: Main Menu opens the right page

  Background:
    Given the following "users" exist:
      | username |
      | student  |

  Scenario: Opens Site Home when defaulthomepage is set to Site
    Given the following config values are set as admin:
      | defaulthomepage | 0 |
    Given I entered the app as "student"
    When "Site home" should be selected in the app
    And I should find "Available courses" in the app
    And "Site home" "text" should appear before "Dashboard" "text" in the ".core-tabs-bar" "css_element"

  Scenario: Opens Dashboard when defaulthomepage is set to Dashboard
    Given the following config values are set as admin:
      | defaulthomepage | 1 |
    Given I entered the app as "student"
    When "Dashboard" should be selected in the app
    And I should find "Course overview" in the app
    And "Dashboard" "text" should appear before "Site home" "text" in the ".core-tabs-bar" "css_element"
