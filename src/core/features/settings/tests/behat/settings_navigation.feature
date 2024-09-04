@core_settings @app @javascript
Feature: It navigates properly within settings.

  Background:
    Given the following "users" exist:
      | username |
      | student1 |

  Scenario: Mobile navigation on settings
    Given I entered the app as "student1"

    # Settings
    When I press the more menu button in the app
    And I press "App settings" in the app
    Then I should find "General" in the app
    And I should find "Space usage" in the app
    And I should find "Synchronisation" in the app
    And I should find "About" in the app

    # Settings details
    When I press "General" in the app
    Then I should find "Language" in the app
    And I should find "Text size" in the app

    When I go back in the app
    And I press "About" in the app
    Then I should find "Moodle Mobile" in the app
    And I should find "Privacy policy" in the app

    # Preferences
    When I go back to the root page in the app
    And I press the user menu button in the app
    And I press "Preferences" in the app
    Then I should find "Messages" in the app
    And I should find "Notifications" in the app
    And I should find "Manage downloads" in the app

    # Preferences details
    When I press "Messages" in the app
    Then I should find "Accept messages from" in the app
    And I should find "Notification preferences" in the app

    When I go back in the app
    And I press "Manage downloads" in the app
    Then I should find "Total space used" in the app

  Scenario: Tablet navigation on settings
    Given I entered the app as "student1"
    And I change viewport size to "1200x640" in the app

    # Settings
    When I press the more menu button in the app
    And I press "App settings" in the app
    Then I should find "General" in the app
    And I should find "Space usage" in the app
    And I should find "Synchronisation" in the app
    And I should find "About" in the app
    And "General" should be selected in the app
    And I should find "Language" in the app
    And I should find "Text size" in the app

    When I press "About" in the app
    Then "About" should be selected in the app
    And I should find "Moodle Mobile" in the app
    And I should find "Privacy policy" in the app

    # Preferences
    When I press the user menu button in the app
    And I press "Preferences" in the app
    Then I should find "Messages" in the app
    And I should find "Notifications" in the app
    And I should find "Manage downloads" in the app
    And "Messages" should be selected in the app
    And I should find "Accept messages from" in the app
    And I should find "Notification preferences" in the app

    When I press "Manage downloads" in the app
    Then "Manage downloads" should be selected in the app
    And I should find "Total space used" in the app
