@app_parallel_run_legal @core_dataprivacy @app @tool @tool_dataprivacy @javascript @lms_from4.4
Feature: Data export and delete from the privacy API
  In order to export or delete data for users and meet legal requirements
  I need to be able to request my data data be exported or deleted

  Background:
    Given the following "users" exist:
      | username       | firstname       | lastname |
      | victim         | Victim User     | 1        |
    And the following config values are set as admin:
      | contactdataprotectionofficer | 1  | tool_dataprivacy |
      | privacyrequestexpiry         | 55 | tool_dataprivacy |
      | dporoles                     | 1  | tool_dataprivacy |

  Scenario: As a student, request deletion of account and data
    Given I entered the app as "victim"
    And I press the user menu button in the app
    And I press "Data privacy" in the app
    And I press "New request" in the app
    And I press "Delete all of my personal data" in the app
    And I press "Send" in the app
    Then I should find "Delete all of my personal data" in the app
    And I should find "Awaiting approval" near "Delete all of my personal data" in the app

  Scenario: As a student, I cannot create data deletion request unless I have permission.
    Given the following "permission overrides" exist:
    | capability                     | permission | role | contextlevel | reference |
    | tool/dataprivacy:requestdelete | Prevent    | user | System       |           |
    And I entered the app as "victim"
    And I press the user menu button in the app
    And I press "Data privacy" in the app
    When I press "New request" in the app
    Then I should not find "Delete all of my personal data" in the app

  Scenario: As a student, request data export and then see the status
    Given I entered the app as "victim"
    And I press the user menu button in the app
    And I press "Data privacy" in the app
    When I press "New request" in the app
    And I press "Export all of my personal data" in the app
    And I set the field "Comments" to "Export my data" in the app
    And I press "Send" in the app
    Then I should find "Export all of my personal data" in the app
    And I should find "Awaiting approval" near "Export all of my personal data" in the app
    And I should find "Export my data" near "Export all of my personal data" in the app

    # The next step allows to naavigate to site administration
    When I change viewport size to "1200x640" in the app
    And I open a browser tab with url "$WWWROOT"
    And I log in as "admin"
    And I navigate to "Users > Privacy and policies > Data requests" in site administration
    And I open the action menu in "Victim User 1" "table_row"
    And I follow "Approve request"
    And I press "Approve request"

    And I switch back to the app
    And I pull to refresh in the app
    Then I should find "Approved" near "Export all of my personal data" in the app
    When I run all adhoc tasks
    And I pull to refresh in the app
    Then I should find "Download ready" near "Export all of my personal data" in the app
    And I press "Download" in the app
    And the app should have opened a browser tab with url "$WWWROOTPATTERN"
