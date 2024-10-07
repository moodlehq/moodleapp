@core_mainmenu @app @javascript
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
    And I entered the app as "student"
    Then "Site home" should be selected in the app
    And I should find "Available courses" in the app
    And "Site home" "text" should appear before "Dashboard" "text" in the ".core-tabs-bar" "css_element"
    And "Home" "text" should appear before "My courses" "text" in the ".mainmenu-tabs" "css_element"

  Scenario: Opens Dashboard when defaulthomepage is set to Dashboard
    Given the following config values are set as admin:
      | defaulthomepage | 1 |
    And I entered the app as "student"
    Then "Dashboard" should be selected in the app
    And I should find "Timeline" in the app
    And "Dashboard" "text" should appear before "Site home" "text" in the ".core-tabs-bar" "css_element"
    And "Home" "text" should appear before "My courses" "text" in the ".mainmenu-tabs" "css_element"

  Scenario: Opens My Courses when defaulthomepage is set to My Courses
    Given the following config values are set as admin:
      | defaulthomepage | 3 |
    And I entered the app as "student"
    Then "My courses" "ion-tab-button" should be selected in the app
    And I should find "Course 1" in the app
    And "My courses" "text" should appear before "Home" "text" in the ".mainmenu-tabs" "css_element"

  @lms_from4.5
  Scenario: Opens right main menu tab when defaulthomepage is set to a custom URL that belongs to a tab
    Given the following config values are set as admin:
      | defaulthomepage | /message/index.php |
    And I entered the app as "student"
    Then "Messages" "ion-tab-button" should be selected in the app
    And I should find "Contacts" in the app

  @lms_from4.5
  Scenario: Opens new page when defaulthomepage is set to a custom URL
    Given the following config values are set as admin:
      | defaulthomepage | /badges/mybadges.php |
    And I entered the app as "student"
    Then I should find "Badges" in the app
    And I should find "There are currently no badges" in the app

    When I press the back button in the app
    Then "My courses" "ion-tab-button" should be selected in the app
    And I should find "Course 1" in the app

  @lms_from4.5
  Scenario: defaulthomepage ignored if it's set to a custom URL not supported by the app
    Given the following config values are set as admin:
      | defaulthomepage | /foo/bar.php |
    And I entered the app as "student"
    Then "My courses" "ion-tab-button" should be selected in the app
    And I should find "Course 1" in the app

# @todo MOBILE-4119: This test is too flaky to run in CI until the race condition is fixed.
#   Scenario: Opens first tab after Site Home, Dashboard, and My Courses are disabled
#     Given I entered the app as "student"
#     Then "Dashboard" should be selected in the app

#     When the following config values are set as admin:
#       | disabledfeatures | $mmSideMenuDelegate_mmaFrontpage,CoreMainMenuDelegate_CoreCoursesDashboard,$mmSideMenuDelegate_mmCourses | tool_mobile |
#     And I restart the app
#     Then I should find "Contacts" in the app
#     But I should not find "Home" in the app
#     And I should not find "My courses" in the app
