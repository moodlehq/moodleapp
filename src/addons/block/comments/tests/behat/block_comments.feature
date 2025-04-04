@addon_block_comments @app @block @block_comments @javascript
Feature: View the comments block and check
    it links to the correct comments page

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email | idnumber |
      | student1 | Student | 1 | student1@example.com | S1 |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1 | 0 |
    And the following "course enrolments" exist:
      | user | course | role |
      | student1 | C1 | student |
    And the following "blocks" exist:
      | blockname      | contextlevel | reference | pagetypepattern | defaultregion |
      | comments       | Course       | C1        | course-view-*   | side-pre      |
      | comments       | System       | 1         | site-index      | side-pre      |

  Scenario: View the comments block in a course
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Open block drawer" in the app
    Then I should find "Comments" in the app
    When I press "Comments" in the app
    Then the header should be "Comments" in the app
    And I should find "No comments" in the app
    And I should find "Course 1" in the app

  Scenario: View the comments block in site home
    Given I entered the app as "student1"
    When I press "Site home" in the app
    And I press "Open block drawer" in the app
    Then I should find "Comments" in the app
    When I press "Comments" in the app
    Then the header should be "Comments" in the app
    And I should find "No comments" in the app
    And I should find "Acceptance test site" in the app
