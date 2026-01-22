@app_parallel_run_user @core_user @app @core @javascript
Feature: Site support

  Background:
    Given the following "users" exist:
      | username | firstname | lastname |
      | student1 | Student   | Student  |
    And I am logged in as "student1"

  Scenario: Uses default support page
    Given I entered the app as "student1"
    When I press the user menu button in the app
    Then I should find "Contact site support" in the app

    When I press "Contact site support" in the app
    Then the app should have opened a browser tab with url ".*\/user\/contactsitesupport\.php"

  Scenario: Uses custom support page
    Given the following config values are set as admin:
      | supportpage | https://campus.example.edu/support |
    And I entered the app as "student1"
    When I press the user menu button in the app
    Then I should find "Contact site support" in the app

    When I press "Contact site support" in the app
    Then the app should have opened a browser tab with url "https:\/\/campus\.example\.edu\/support"

  @disabled_features
  Scenario: Cannot contact support
    Given the following config values are set as admin:
      | disabledfeatures | NoDelegate_CoreUserSupport | tool_mobile |
    And I entered the app as "student1"
    When I press the user menu button in the app
    Then I should find "Blog entries" in the app
    But I should not find "Contact site support" in the app
