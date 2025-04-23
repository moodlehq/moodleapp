@addon_block_tags @app @block @block_tags @javascript
Feature: Basic tests of tags block

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email                |
      | teacher1 | Teacher   | 1        | teacher1@example.com |
      | student1 | Student   | 1        | student1@example.com |
      | student2 | Student   | 2        | student2@example.com |
    And the following "courses" exist:
      | fullname | shortname | format |
      | Course 1 | C1 | topics |
    And the following "activity" exists:
      | activity    | book                |
      | course      | C1                  |
      | idnumber    | book1               |
      | name        | Test book           |
    And the following "course enrolments" exist:
      | user | course | role |
      | teacher1 | C1 | editingteacher |
      | student1 | C1 | student |
    And the following "blocks" exist:
      | blockname       | contextlevel | reference | pagetypepattern | defaultregion |
      | tags            | System       | 1         | my-index        | side-pre      |
    And I am on the "Test book" "book activity" page logged in as teacher1
    And I set the following fields to these values:
      | Chapter title | Dummy first chapter |
      | Content | Dream is the start of a journey |
      | Tags | Example, Chapter, Cool |
    And I press "Save changes"

  Scenario: View and navigate the blog tags block in a course
    And I entered the app as "student1"
    When I press "Open block drawer" in the app
    Then I should find "Example" within "Tags" "ion-card" in the app
    Then I should find "Chapter" within "Tags" "ion-card" in the app
    Then I should find "Cool" within "Tags" "ion-card" in the app
    When I press "Example" in the app
    Then the header should be "Tag: Example" in the app
    And I should find "Book chapters" in the app
    When I press "Book chapters" in the app
    Then the header should be "Book chapters tagged with \"Example\"" in the app
    And I should find "Dummy first chapter" in the app
    When I press "Dummy first chapter" in the app
    Then the header should be "Test book" in the app
    And I should find "Dummy first chapter" in the app
    And I should find "Example" in the app
    And I should find "Chapter" in the app
    And I should find "Cool" in the app

  Scenario: Block is included in disabled features
    # Add another block just to ensure there is something in the block region and the drawer is displayed.
    Given the following "blocks" exist:
      | blockname        | contextlevel | reference | pagetypepattern | defaultregion | configdata                                                                                                   |
      | html             | System       | 1         | my-index        | side-pre      | Tzo4OiJzdGRDbGFzcyI6Mjp7czo1OiJ0aXRsZSI7czoxNToiSFRNTCB0aXRsZSB0ZXN0IjtzOjQ6InRleHQiO3M6OToiYm9keSB0ZXN0Ijt9 |
    And the following config values are set as admin:
      | disabledfeatures | CoreBlockDelegate_AddonBlockTags | tool_mobile |
    And I entered the app as "student1"
    When I press "Open block drawer" in the app
    Then I should not find "Tags" in the app
