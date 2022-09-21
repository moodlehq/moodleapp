@core @core_user @app @javascript @lms_from4.0
Feature: Site support

  Background:
    Given the following "users" exist:
      | username | firstname | lastname |
      | student1 | Student   | Student  |

  Scenario: Uses default support page
    Given I entered the app as "student1"
    When I press the user menu button in the app
    Then I should find "Support" in the app

    When I press "Support" in the app
    Then the app should have opened a browser tab with url ".*\/user\/contactsitesupport\.php"

  Scenario: Uses custom support page
    Given the following config values are set as admin:
      | supportpage | https://campus.example.edu/support |
    And I entered the app as "student1"
    When I press the user menu button in the app
    Then I should find "Support" in the app

    When I press "Support" in the app
    Then the app should have opened a browser tab with url "https:\/\/campus\.example\.edu\/support"

  Scenario: Cannot contact support
    Given the following config values are set as admin:
      | disabledfeatures | NoDelegate_CoreUserSupport | tool_mobile |
    And I entered the app as "student1"
    When I press the user menu button in the app
    Then I should find "Blog entries" in the app
    But I should not find "Support" in the app
