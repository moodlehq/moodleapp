@core @core_user @app @javascript @lms_upto3.11
Feature: Site support

  Background:
    Given the following "users" exist:
      | username | firstname | lastname |
      | student1 | Student   | Student  |

  Scenario: Cannot contact support
    Given I entered the app as "student1"
    When I press the user menu button in the app
    Then I should find "Blog entries" in the app
    But I should not find "Support" in the app
