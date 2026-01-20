@app_parallel_run_core @core_directives @app @core @javascript
Feature: Test functionality added by the format-text directive

  Background:
    Given the following "users" exist:
      | username | firstname  | lastname  | email                |
      | student1 | Student1   | student1  | student1@example.com |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |

  # The wwwroot replacement was introduced in Moodle 4.3.
  @lms_from4.3
  Scenario: Displays alternative content in the app
    Given the following "activities" exist:
      | activity   | course | name          | intro                                                                                                                                                               |
      | label      | C1     | Label title   | <div data-app-alt-url="#wwwroot#/my/courses.php">Content for browser</div>                                                                                          |
      | label      | C1     | Label 2 title | <div data-app-alt-url="#wwwroot#/?redirect=0" data-app-alt-msg="Open this link" data-open-in="app" data-app-url-confirm="Custom confirm.">Content for browser</div> |
      | label      | C1     | Label 3 title | <div data-app-alt-url="#wwwroot#/user/view.php" data-open-in="app">Content for browser</div>                                                                        |
      | label      | C1     | Label 3 title | <div class="d-none mobileapp-d-block">No lms, but yes mobile app</div><div class="d-block mobileapp-d-none">Yes lms, but no mobile app</div><div class="d-none mobileapp-d-inline">Inline in mobile app</div><div class="d-none mobileapp-d-inline-block">Inline-block in mobile app</div><div class="d-none mobileapp-d-flex">Flex in mobile app</div> |
    Given I entered the course "Course 1" as "student1" in the app
    Then I should find "Open this link" in the app
    And I should find "$WWWROOT/my/courses.php" in the app
    And I should find "$WWWROOT/?redirect=0" in the app
    But I should not find "Content for browser" in the app

    And I should find "No lms, but yes mobile app" in the app
    And I should find "Inline in mobile app" in the app
    And I should find "Inline-block in mobile app" in the app
    And I should find "Flex in mobile app" in the app
    But I should not find "Yes lms, but no mobile app" in the app

    When I press "$WWWROOT/my/courses.php" in the app
    Then I should not find "Custom confirm" in the app

    When I press "OK" in the app
    Then the app should have opened a browser tab with url "$WWWROOTPATTERN"

    When I close the browser tab opened by the app
    And I press "$WWWROOT/?redirect=0" in the app
    Then I should find "Custom confirm" in the app

    When I press "OK" in the app
    Then the app should have opened a browser tab with url "$WWWROOTPATTERN"

    # In Behat there's no difference between system browser and embedded browser, just check that the browser confirmation isn't shown.
    When I close the browser tab opened by the app
    And I press "$WWWROOT/user/view.php" in the app
    Then the app should have opened a browser tab with url "$WWWROOTPATTERN"
