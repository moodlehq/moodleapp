@app_parallel_run_core @core_mainmenu @app @javascript @custom_menu_items
Feature: Custom user menu items display
  In order to access custom links in the user menu
  As a user
  I need to be able to see and interact with custom menu items

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
      | username | firstname | lastname | email              |
      | student  | Student   | User     | student@moodle.com |

  @lms_from5.2
  Scenario: Display custom user menu items with different types
    Given I log in as "admin"
    When I navigate to "General > Mobile app > Mobile features" in site administration
    And I set the field "Custom user menu items" to multiline:
    """
    App item only English|https://www.moodle.org|inappbrowser|en_only
    Browser item|https://www.website2.org|browser|en
    Item de navegador|https://www.website2.org|browser|es
    Embedded item|https://www.moodle.org|embedded
    """
    And I press "Save changes"
    And I entered the app as "student"
    When I press the user menu button in the app
    Then I should find "App item only English" in the app
    And I should find "Browser item" in the app
    And I should find "Embedded item" in the app
    And I should not find "Item de navegador" in the app

    When I press "Browser item" in the app
    Then I should find "You are about to leave the app" in the app
    And I should find "https://www.website2.org" in the app

    When I press "Cancel" in the app
    And I press "App item only English" in the app
    Then the app should have opened a browser tab with url "moodle.org"
    And I close the browser tab opened by the app

    When I press "Embedded item" in the app
    Then the header should be "Embedded item" in the app

    When I change language to "es" in the app
    And I press the user menu button in the app
    Then I should not find "App item only English" in the app
    And I should not find "Browser item" in the app
    And I should find "Embedded item" in the app
    And I should find "Item de navegador" in the app

  Scenario: Display custom menu items with different types
    Given I log in as "admin"
    When I navigate to "General > Mobile app > Mobile features" in site administration
    And I set the field "Custom menu items" to multiline:
    """
    App item only English|https://www.moodle.org|inappbrowser|en_only
    Browser item|https://www.website2.org|browser|en
    Item de navegador|https://www.website2.org|browser|es
    Embedded item|https://www.moodle.org|embedded
    """
    And I press "Save changes"
    And I entered the app as "student"
    When I press the more menu button in the app
    Then I should find "App item only English" in the app
    And I should find "Browser item" in the app
    And I should find "Embedded item" in the app
    And I should not find "Item de navegador" in the app

    When I press "Browser item" in the app
    Then I should find "You are about to leave the app" in the app
    And I should find "https://www.website2.org" in the app

    When I press "Cancel" in the app
    And I press "App item only English" in the app
    Then the app should have opened a browser tab with url "moodle.org"
    And I close the browser tab opened by the app

    When I press "Embedded item" in the app
    Then the header should be "Embedded item" in the app

    When I change language to "es" in the app
    And I press the more menu button in the app
    Then I should not find "App item only English" in the app
    And I should not find "Browser item" in the app
    And I should find "Embedded item" in the app
    And I should find "Item de navegador" in the app
