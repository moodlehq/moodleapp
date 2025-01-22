@addon_messages @app @core @core_message @javascript
Feature: Test messages settings

  Background:
    Given the following "users" exist:
      | username |
      | student1 |

  Scenario: Modify settings
    Given I entered the app as "student1"
    When I press "Messages" in the app
    And I press "Message preferences" in the app
    And I select "My contacts only" in the app
    Then "My contacts only" should be selected in the app

    And I select "My contacts and anyone in my courses" in the app
    Then "My contacts and anyone in my courses" should be selected in the app
