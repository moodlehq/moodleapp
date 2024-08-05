@core_login @app @javascript @lms_from4.5
Feature: Test showloginform setting in the app

  Background:
    Given the Moodle site is compatible with this feature
    And the following config values are set as admin:
      | showloginform | 0 |
    And the following "users" exist:
      | username | firstname | lastname |
      | student  | david     | student  |

  Scenario: Login
    When I launch the app
    And I set the field "Your site" to "$WWWROOT" in the app
    And I press "Connect to your site" in the app
    Then the header should be "Log in" in the app
    And I should not find "Log in" "ion-button" in the app
    And I replace "/.*/" within ".core-siteurl" with "https://campus.example.edu"
    And the UI should match the snapshot

  Scenario: Reconnect
    When I entered the app as "student"
    And I log out in the app
    And I press "david student" in the app
    Then the header should be "Reconnect" in the app
    And I should not find "Log in" "ion-button" in the app
    And I replace "/.*/" within ".core-siteurl" with "https://campus.example.edu"
    And the UI should match the snapshot

  Scenario: Login with forced developer option
    When I launch the app
    And I set the field "Your site" to "$WWWROOT" in the app
    And I press "Connect to your site" in the app
    And I press "App settings" in the app
    And I press "About" in the app
    And I press "Moodle Mobile" in the app
    And I press "Developer options" in the app
    And I press "Always show login form" in the app
    And I press the back button in the app
    And I press the back button in the app
    And I press the back button in the app
    And I press the back button in the app
    Then the header should be "Log in" in the app
    And I should find "Log in" "ion-button" in the app

  Scenario: Reconnect with forced developer option
    When I entered the app as "student"
    And I log out in the app
    And I press "App settings" in the app
    And I press "About" in the app
    And I press "Moodle Mobile" in the app
    And I press "Developer options" in the app
    And I press "Always show login form" in the app
    And I press the back button in the app
    And I press the back button in the app
    And I press the back button in the app
    And I press the back button in the app
    And I press "david student" in the app
    Then the header should be "Reconnect" in the app
    And I should find "Log in" "ion-button" in the app
