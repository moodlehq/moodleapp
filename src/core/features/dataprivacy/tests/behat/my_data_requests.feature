@core_dataprivacy @app @tool @tool_dataprivacy @javascript @lms_from4.4
Feature: Manage my own data requests
  In order to manage my own data requests
  As a user
  I need to be able to view and cancel all my data requests

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email          |
      | student1 | Student   | 1        | s1@example.com |
    And the following config values are set as admin:
      | contactdataprotectionofficer | 1 | tool_dataprivacy |

  Scenario: Cancel my own data request
    Given I entered the app as "student1"
    And I press the user menu button in the app
    And I press "Data privacy" in the app
    And I press "Contact the privacy officer" in the app
    And I set the field "Message" to "Hello DPO!" in the app
    And I press "Send" in the app
    Then I should find "Your request has been submitted to the privacy officer" in the app
    When I press "Cancel request" near "Hello DPO!" in the app
    And I press "Cancel request" "button" in the app
    Then I should find "Cancelled" near "Hello DPO!" in the app
