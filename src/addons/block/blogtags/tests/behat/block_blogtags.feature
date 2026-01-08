@app_parallel_run_blog @addon_block_blog_tags @app @block @block_blog_tags @javascript
Feature: Basic tests of blog tags block

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email | idnumber |
      | student1 | Student | 1 | student1@example.com | S1 |
      | teacher1 | Teacher | 1 | teacher1@example.com | T1 |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1 | 0 |
    And the following "course enrolments" exist:
      | user | course | role           |
      | student1 | C1 | student        |
      | teacher1 | C1 | editingteacher |
    And the following "blocks" exist:
      | blockname    | contextlevel | reference | pagetypepattern | defaultregion |
      | blog_tags    | Course       | C1        | course-view-*   | side-pre      |
    And the following "tags" exist:
      | name | isstandard |
      | T1   | 1          |
      | T2   | 1          |
      | T3   | 1          |
    And the following config values are set as admin:
      | unaddableblocks | | theme_boost|

    And I log in as "teacher1"
    And I am on "Course 1" course homepage with editing mode on
    # TODO MDL-57120 site "Blogs" link not accessible without navigation block.
    And I add the "Navigation" block if not present

    And I navigate to course participants
    And I click on "Course blogs" "link" in the "Navigation" "block"
    And I follow "Blog about this Course"
    And I set the following fields to these values:
      | Entry title     | Blog test       |
      | Blog entry body | Blog body       |
      | Tags            | T1, T2          |
    And I press "Save changes"

  Scenario: View and navigate the blog tags block in a course
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Open block drawer" in the app
    Then I should find "Blog tags" in the app
    And I should find "T1" in the app
    And I should find "T2" in the app
    When I press "T2" in the app
    Then the header should be "Blog entries" in the app
    And I should find "Blog test" in the app
    And I should find "Blog body" in the app
    And I should find "T1" in the app
    And I should find "T2" in the app

  Scenario: Block is included in disabled features
    # Add another block just to ensure there is something in the block region and the drawer is displayed.
    Given the following "blocks" exist:
      | blockname        | contextlevel | reference | pagetypepattern | defaultregion | configdata                                                                                                   |
      | html             | Course       | C1        | course-view-*   | side-pre      | Tzo4OiJzdGRDbGFzcyI6Mjp7czo1OiJ0aXRsZSI7czoxNToiSFRNTCB0aXRsZSB0ZXN0IjtzOjQ6InRleHQiO3M6OToiYm9keSB0ZXN0Ijt9 |
    And the following config values are set as admin:
      | disabledfeatures | CoreBlockDelegate_AddonBlockBlogTags | tool_mobile |
    And  I entered the course "Course 1" as "student1" in the app
    When I press "Open block drawer" in the app
    Then I should not find "Blog tags" in the app
