@app_parallel_run_scorm @addon_mod_scorm @app @mod @mod_scorm @javascript @singleactivity
Feature: Test single activity of scorm type in app
  In order to view a scorm while using the mobile app
  As a student
  I need single activity of scorm type functionality to work

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email                |
      | student1 | Student   | One      | student1@example.com |
    And the following "courses" exist:
      | fullname                     | shortname | format         | activitytype |
      | Single activity SCORM course | C1        | singleactivity | scorm        |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | student1 | C1     | student        |
    And the following "activities" exist:
      | activity | course | name       | packagefilepath                                          | popup |
      | scorm    | C1     | C1 Scorm 1 | mod/scorm/tests/packages/RuntimeMinimumCalls_SCORM12.zip | 0     |

  Scenario: Single activity scorm
    Given I entered the course "Single activity SCORM course" as "student1" in the app
    And I replace "/.*/" within ".addon-scorm-last-sync-date" with "[Date]"

    When I set "page-core-course-index core-course-image" styles to "background" "lightblue"
    And I set "page-core-course-index core-course-image" styles to "--core-image-visibility" "hidden"
    Then the UI should match the snapshot

    When I press "Enter" in the app
    And I press "Disable fullscreen" in the app
    Then the header should be "How to Play" in the app
    When I go back in the app
    # Confirm that student can exit activity
    Then I should find "Preview" in the app
    And I should find "Enter" in the app
    And I should not find "Golf Explained - Minimum Run-time Calls" in the app
