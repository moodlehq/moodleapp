@addon_blog @app @core @core_blog @javascript @lms_from4.4
Feature: Edit blog entries
  In order to add or edit blog entries as User

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
      | username | firstname | lastname | email              |
      | testuser  | Test      | User     | moodle@example.com |
      | testuser2 | Test      | User2    | moodle@example.com |
    And the following "core_blog > entries" exist:
      | subject       | body                     | user     |
      | Blog post one | User 1 blog post content | testuser |
      | Blog post two | User 1 blog post content | testuser |

  Scenario: Edit blog entry
    Given I entered the app as "testuser"
    When I press the user menu button in the app
    And I press "Blog entries" in the app
    Then I should find "Blog post one" in the app
    And I press "Display options" in the app
    And I press "Edit" in the app

    Then I should find "Blog post one" in the app
    And I set the field "Entry title" to "Blog post one (updated)" in the app
    And I set the field "Blog entry body" to "User 1 blog post content (updated)" in the app
    And I press "Publish to" in the app
    And I press "Yourself (draft)" in the app
    And I press "Save" in the app

    Then I should find "Blog post one (updated)" in the app
    And I should find "User 1 blog post content (updated)" in the app
    And I should find "Yourself (draft)" near "User 1 blog post content (updated)" in the app

  Scenario: Add a blog entry
    Given I entered the app as "testuser"
    When I press the user menu button in the app
    And I press "Blog entries" in the app
    And I press "Add a new entry" in the app

    And I set the field "Entry title" to "New blog entry" in the app
    And I set the field "Blog entry body" to "This is a new blog entry." in the app
    And I press "Publish to" in the app
    And I press "Anyone on this site" in the app
    And I press "Save" "button" in the app

    Then I should find "Blog entries" in the app
    And I should find "New blog entry" in the app

  Scenario: Add a blog entry with attachments
    Given I entered the app as "testuser"
    When I press the user menu button in the app
    And I press "Blog entries" in the app
    And I press "Add a new entry" in the app

    And I set the field "Entry title" to "Entry with attachments" in the app
    And I set the field "Blog entry body" to "This is a new blog entry with attachments." in the app

    And I press "Add file" in the app
    And I upload "stub6.txt" to "File" ".action-sheet-button" in the app
    And I press "Add file" in the app
    And I upload "stub7.txt" to "File" ".action-sheet-button" in the app

    And I press "Save" "button" in the app

    Then I should find "Blog entries" in the app
    And I should find "Entry with attachments" in the app
    And I should find "stub6.txt" in the app
    And I should find "stub7.txt" in the app

  Scenario: Changing blog visibility to Users can only see their own blog
    Given the following config values are set as admin:
      | bloglevel | 1 |
    And I entered the app as "testuser"
    When I press the user menu button in the app
    And I press "Blog entries" in the app
    And I press "Add a new entry" in the app
    And I press "Publish to" in the app
    Then I should not find "Anyone on this site" in the app

  Scenario: Changing blog visibility to All site users can see all blog entries
    Given the following config values are set as admin:
      | bloglevel | 4 |
    And I entered the app as "testuser"
    When I press the user menu button in the app
    And I press "Blog entries" in the app
    And I press "Add a new entry" in the app
    And I press "Publish to" in the app
    Then I should find "Anyone on this site" in the app

  Scenario: Changing blog visibility to The world can read entries set to be world-accessible
    Given the following config values are set as admin:
      | bloglevel | 5 |
    And I entered the app as "testuser"
    When I press the user menu button in the app
    And I press "Blog entries" in the app
    And I press "Add a new entry" in the app
    And I press "Publish to" in the app
    Then I should find "Anyone in the world" in the app
