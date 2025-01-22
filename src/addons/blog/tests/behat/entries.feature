@addon_blog @app @core @core_blog @javascript @lms_from4.4
Feature: Blog entries
  In order to modify or delete a blog entry
  As a user

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
      | username | firstname | lastname | email              |
      | testuser | Test      | User     | moodle@example.com |
    And the following "core_blog > entries" exist:
      | subject       | body                     | user     |
      | Blog post one | User 1 blog post content | testuser |
      | Blog post two | User 1 blog post content | testuser |

  Scenario: List every blog entry
    Given I entered the app as "testuser"
    When I press the user menu button in the app
    And I press "Blog entries" in the app
    Then I should find "Blog post one" in the app
    And I should find "Blog post two" in the app
    And the following events should have been logged for "testuser" in the app:
      | name                            |
      | \core\event\blog_entries_viewed |

  Scenario: Delete blog entry
    Given I entered the app as "testuser"
    When I press the user menu button in the app
    And I press "Blog entries" in the app
    Then I should find "Blog post one" in the app
    When I press "Display options" near "Blog post one" in the app
    And I press "Delete" in the app
    Then I should find "Delete the blog entry" in the app
    And I press "Delete" in the app
    And I pull to refresh in the app
    And I should not find "Blog post one" in the app
