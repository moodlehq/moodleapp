@mod @mod_messages @app @javascript
Feature: Test messages settings

  Background:
    Given the following "users" exist:
      | username |
      | student1 |

  Scenario: Modify settings
    When I enter the app
    And I log in as "student1"
    And I press "Messages" in the app
    And I press "Message preferences" in the app
    And I select "My contacts only" in the app
    Then "My contacts only" should be selected in the app

    And I select "My contacts and anyone in my courses" in the app
    Then "My contacts and anyone in my courses" should be selected in the app
