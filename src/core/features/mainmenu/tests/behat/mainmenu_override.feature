@app_parallel_run_core @core_mainmenu @app @javascript
Feature: Main menu override config
  In order to customize the main menu
  As an admin
  I want to override the icon and order of main menu items

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

  Scenario: Override main menu item order and icon
    Given the app has the following config:
      | overrideMainMenuButtons | [{"handler":"AddonBlog","priority":3000,"icon":"fas-house"}] |
    When I enter the app
    And I log in as "student"
    Then "Site blog" "text" should appear before "My courses" "text" in the ".mainmenu-tabs" "css_element"
    And "Site blog" "ion-tab-button" should be selected in the app
    And the UI should match the snapshot
    And I should not find "Notifications" in the app
    When I press the more menu button in the app
    Then I should find "Notifications" in the app

    # Override when the app is running test.
    When the environment config is patched with:
      | overrideMainMenuButtons | [{"handler":"AddonCalendar","priority":2000,"icon":"fas-book"}] |
    Then "Calendar" "text" should appear before "My courses" "text" in the ".mainmenu-tabs" "css_element"
    And I should find "Site blog" in the app
    When I press "Calendar" in the app
    Then the header should be "Calendar" in the app
    And I should not find "Site blog" in the app
