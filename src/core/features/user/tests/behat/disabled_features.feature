@app_parallel_run_user @core_user @app @javascript @lms_from5.0
Feature: Test user menu disabled features

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
      | username |
      | student  |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user    | course | role    |
      | student | C1     | student |
    And the following "core_competency > plans" exist:
      | name       | user  | description                    | status |
      | Test-Plan1 | student| Description of plan for user 1 | active |
    And the following config values are set as admin:
      | contactdataprotectionofficer | 1 | tool_dataprivacy |
    And the following config values are set as admin:
      | sitepolicyhandler | tool_policy |

  Scenario: Check user menu options are displayed when there are no disabled features
    And I entered the app as "student"
    When I press the user menu button in the app
    Then I should find "Grades" in the app
    And I should find "Files" in the app
    And I should find "Reports" in the app
    And I should find "Badges" in the app
    And I should find "Blog entries" in the app
    And I should find "Learning plans" in the app
    And I should find "Policies and agreements" in the app
    And I should find "Data privacy" in the app
    And I should find "Switch account" in the app

  @disabled_features
  Scenario: Check user menu options are not displayed when disabled
    # Use old name to allow working in all LMS versions.
    Given the following config values are set as admin:
      | disabledfeatures | $mmSideMenuDelegate_mmaGrades,$mmSideMenuDelegate_mmaFiles,CoreUserDelegate_AddonBadges:account,CoreUserDelegate_AddonBlog:account,$mmSideMenuDelegate_mmaCompetency,CoreUserDelegate_CorePolicy,CoreUserDelegate_CoreDataPrivacy,NoDelegate_SwitchAccount,CoreReportBuilderDelegate | tool_mobile |
    And I entered the app as "student"
    When I press the user menu button in the app
    Then I should not find "Grades" in the app
    And I should not find "Files" in the app
    And I should not find "Reports" in the app
    And I should not find "Badges" in the app
    And I should not find "Blog entries" in the app
    And I should not find "Learning plans" in the app
    And I should not find "Policies and agreements" in the app
    And I should not find "Data privacy" in the app
    And I should not find "Switch account" in the app
