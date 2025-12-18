@app_parallel_run_legal @core_policy @app @tool @tool_policy @javascript @lms_from4.4
Feature: Test contact DPO from acceptances page

  Background:
    Given the following config values are set as admin:
      | sitepolicyhandler | tool_policy |
    And the following "users" exist:
      | username | firstname | lastname | email           |
      | student  | User      | One      | one@example.com |

  Scenario: Cannot contact DPO if not enabled
    When I entered the app as "student"
    And I press the user menu button in the app
    And I press "Policies and agreements" in the app
    Then I should find "For any questions about the policies please contact the privacy officer" in the app
    But I should not be able to press "Contact" in the app

  Scenario: Can contact DPO if enabled
    Given the following config values are set as admin:
      | contactdataprotectionofficer | 1 | tool_dataprivacy |
    When I entered the app as "student"
    And I press the user menu button in the app
    And I press "Policies and agreements" in the app
    Then I should find "For any questions about the policies please contact the privacy officer" in the app

    When I press "Contact" in the app
    Then I should find "Data privacy" in the app
    And I should be able to press "Contact the privacy officer" in the app
