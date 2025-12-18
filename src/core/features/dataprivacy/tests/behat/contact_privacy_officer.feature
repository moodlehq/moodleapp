@app_parallel_run_legal @core_dataprivacy @app @tool @tool_dataprivacy @javascript @lms_from4.4
Feature: Contact the privacy officer
  As a user
  In order to reach out to the site's privacy officer
  I need to be able to contact the site's privacy officer in Moodle

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email          |
      | student1 | Student   | 1        | s1@example.com |

  Scenario: Contacting the privacy officer
    Given the following config values are set as admin:
      | contactdataprotectionofficer | 1 | tool_dataprivacy |
    When I entered the app as "student1"
    And I press the user menu button in the app
    And I press "Data privacy" in the app
    And I press "Contact the privacy officer" in the app
    And I set the field "Message" to "Hello DPO!" in the app
    And I press "Send" in the app
    Then I should find "Your request has been submitted to the privacy officer" in the app
    And I should find "Hello DPO!" in the app

  Scenario: Contacting the privacy officer when not enabled
    When I entered the app as "student1"
    And I press the user menu button in the app
    Then I should not find "Data privacy" in the app
