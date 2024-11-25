@addon_mod_forum @app @javascript
Feature: Test usage of forum activity with groups in app

  Background:
    Given the Moodle site is compatible with this feature
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "users" exist:
      | username |
      | student1 |
      | teacher1 |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
      | teacher1 | C1     | editingteacher |
    And the following "groups" exist:
      | name    | course | idnumber |
      | Group 1 | C1     | G1       |
      | Group 2 | C1     | G2       |
    And the following "group members" exist:
      | user     | group |
      | student1 | G1    |
    And the following "activities" exist:
      | activity   | name                  | intro       | course | idnumber | groupmode | assessed | scale |
      | forum      | Separate groups forum | Test forum  | C1     | forum    | 1         | 1        | 1     |
      | forum      | Visible groups forum  | Test forum  | C1     | forum2   | 2         | 1        | 1     |
    And the following "mod_forum > discussions" exist:
      | forum  | name         | subject      | message              | group            |
      | forum  | Disc sep G1  | Disc sep G1  | Disc sep G1 content  | G1               |
      | forum  | Disc sep G2  | Disc sep G2  | Disc sep G2 content  | G2               |
      | forum  | Disc sep ALL | Disc sep ALL | Disc sep ALL content | All participants |
      | forum2 | Disc vis G1  | Disc vis G1  | Disc vis G1 content  | G1               |
      | forum2 | Disc vis G2  | Disc vis G2  | Disc vis G2 content  | G2               |
      | forum2 | Disc vis ALL | Disc vis ALL | Disc vis ALL content | All participants |

  Scenario: Student can only see the right groups
    Given I entered the course "Course 1" as "student1" in the app
    And I press "Separate groups forum" in the app
    Then I should find "Disc sep G1" in the app
    And I should find "Disc sep ALL" in the app
    But I should not find "Disc sep G2" in the app

    When I press "Separate groups" in the app
    Then I should find "Group 1" in the app
    But I should not find "All participants" in the app
    And I should not find "Group 2" in the app

    When I press "Group 1" in the app
    And I go back in the app
    And I press "Visible groups forum" in the app
    And I press "Visible groups" in the app
    Then I should find "All participants" in the app
    And I should find "Group 1" in the app
    And I should find "Group 2" in the app

    When I press "All participants" in the app
    Then I should find "Disc vis G1" in the app
    And I should find "Disc vis ALL" in the app
    And I should find "Disc vis G2" in the app

    When I press "Visible groups" in the app
    And I press "Group 1" in the app
    Then I should find "Disc vis G1" in the app
    And I should find "Disc vis ALL" in the app
    But I should not find "Disc vis G2" in the app

  Scenario: Teacher can see all groups
    Given I entered the course "Course 1" as "teacher1" in the app
    And I press "Separate groups forum" in the app
    When I press "Separate groups" in the app
    Then I should find "All participants" in the app
    And I should find "Group 1" in the app
    And I should find "Group 2" in the app

    When I press "All participants" in the app
    Then I should find "Disc sep G1" in the app
    And I should find "Disc sep ALL" in the app
    And I should find "Disc sep G2" in the app

    When I press "Separate groups" in the app
    And I press "Group 1" in the app
    Then I should find "Disc sep G1" in the app
    And I should find "Disc sep ALL" in the app
    But I should not find "Disc sep G2" in the app

    When I press "Separate groups" in the app
    And I press "Group 2" in the app
    Then I should find "Disc sep G2" in the app
    And I should find "Disc sep ALL" in the app
    But I should not find "Disc sep G1" in the app

    When I go back in the app
    And I press "Visible groups forum" in the app
    And I press "Visible groups" in the app
    Then I should find "All participants" in the app
    And I should find "Group 1" in the app
    And I should find "Group 2" in the app

    When I press "All participants" in the app
    Then I should find "Disc vis G1" in the app
    And I should find "Disc vis ALL" in the app
    And I should find "Disc vis G2" in the app

    When I press "Visible groups" in the app
    And I press "Group 1" in the app
    Then I should find "Disc vis G1" in the app
    And I should find "Disc vis ALL" in the app
    But I should not find "Disc vis G2" in the app

  Scenario: Student can only add discussions in his groups
    Given I entered the course "Course 1" as "student1" in the app
    And I press "Separate groups forum" in the app
    When I press "Add discussion topic" in the app
    And I press "Advanced" in the app
    Then I should not find "Post a copy to all groups" in the app
    And I should find "Posting in group \"Group 1\"" in the app

    When I press "Group" in the app
    Then I should find "Group 1" in the app
    But I should not find "All participants" in the app
    And I should not find "Group 2" in the app

    When I press "Group 1" in the app
    And I set the field "Subject" to "My happy subject" in the app
    And I set the field "Message" to "An awesome message" in the app
    And I press "Post to forum" in the app
    Then I should find "Your post was successfully added" in the app
    And I should find "My happy subject" in the app

    When I go back in the app
    And I press "Visible groups forum" in the app
    And I press "Visible groups" in the app
    And I press "All participants" in the app
    Then I should not find "Add discussion topic" in the app
    But I should find "You do not have permission to add a new discussion topic for all participants" in the app

    When I press "Visible groups" in the app
    And I press "Group 2" in the app
    Then I should not find "Add discussion topic" in the app
    But I should find "Adding discussions to this forum requires group membership" in the app

    When I press "Visible groups" in the app
    And I press "Group 1" in the app
    And I press "Add discussion topic" in the app
    And I press "Advanced" in the app
    Then I should not find "Post a copy to all groups" in the app
    And I should find "Posting in group \"Group 1\"" in the app

    When I press "Group" in the app
    Then I should find "Group 1" in the app
    But I should not find "All participants" in the app
    And I should not find "Group 2" in the app

    When I press "Group 1" in the app
    And I set the field "Subject" to "My happy subject" in the app
    And I set the field "Message" to "An awesome message" in the app
    And I press "Post to forum" in the app
    Then I should find "Your post was successfully added" in the app
    And I should find "My happy subject" in the app

    When I press "Visible groups" in the app
    And I press "Group 2" in the app
    Then I should not find "My happy subject" in the app

    When I press "Visible groups" in the app
    And I press "All participants" in the app
    Then I should find "My happy subject" in the app

  Scenario: Teacher can add discussion to any group
    Given I entered the course "Course 1" as "teacher1" in the app
    And I press "Separate groups forum" in the app
    When I press "Separate groups" in the app
    And I press "All participants" in the app
    And I press "Add discussion topic" in the app
    And I press "Advanced" in the app
    Then I should find "Post a copy to all groups" in the app
    And I should find "All participants" in the app
    But I should not find "Posting in group" in the app

    When I set the field "Subject" to "My first subject" in the app
    And I set the field "Message" to "An awesome message" in the app
    And I press "Post to forum" in the app
    Then I should find "Your post was successfully added" in the app
    And I should find "My first subject" in the app

    When I press "Separate groups" in the app
    And I press "Group 1" in the app
    Then I should find "My first subject" in the app

    When I press "Separate groups" in the app
    And I press "Group 2" in the app
    Then I should find "My first subject" in the app

    When I press "Add discussion topic" in the app
    And I press "Advanced" in the app
    Then I should find "Post a copy to all groups" in the app
    And I should find "Posting in group \"Group 2\"" in the app

    When I set the field "Subject" to "My second subject" in the app
    And I set the field "Message" to "An awesome message" in the app
    And I press "Post to forum" in the app
    Then I should find "Your post was successfully added" in the app
    And I should find "My second subject" in the app

    When I press "Separate groups" in the app
    And I press "Group 1" in the app
    Then I should not find "My second subject" in the app

    When I press "Add discussion topic" in the app
    Then I should find "Posting in group \"Group 1\"" in the app

    When I press "Advanced" in the app
    And I press "Group" in the app
    And I press "Group 2" in the app
    Then I should find "Posting in group \"Group 2\"" in the app

    When I set the field "Subject" to "My third subject" in the app
    And I set the field "Message" to "An awesome message" in the app
    And I press "Post to forum" in the app
    Then I should find "Your post was successfully added" in the app
    But I should not find "My third subject" in the app

    When I press "Separate groups" in the app
    And I press "Group 2" in the app
    Then I should find "My third subject" in the app

    When I go back in the app
    And I press "Visible groups forum" in the app
    And I press "Visible groups" in the app
    And I press "All participants" in the app
    And I press "Add discussion topic" in the app
    And I press "Advanced" in the app
    Then I should find "Post a copy to all groups" in the app
    And I should find "All participants" in the app
    But I should not find "Posting in group" in the app

    When I set the field "Subject" to "My first subject" in the app
    And I set the field "Message" to "An awesome message" in the app
    And I press "Post to forum" in the app
    Then I should find "Your post was successfully added" in the app
    And I should find "My first subject" in the app

    When I press "Visible groups" in the app
    And I press "Group 1" in the app
    Then I should find "My first subject" in the app

    When I press "Visible groups" in the app
    And I press "Group 2" in the app
    Then I should find "My first subject" in the app

    When I press "Add discussion topic" in the app
    And I press "Advanced" in the app
    Then I should find "Post a copy to all groups" in the app
    And I should find "Posting in group \"Group 2\"" in the app

    When I set the field "Subject" to "My second subject" in the app
    And I set the field "Message" to "An awesome message" in the app
    And I press "Post to forum" in the app
    Then I should find "Your post was successfully added" in the app
    And I should find "My second subject" in the app

    When I press "Visible groups" in the app
    And I press "Group 1" in the app
    Then I should not find "My second subject" in the app

    When I press "Add discussion topic" in the app
    Then I should find "Posting in group \"Group 1\"" in the app

    When I press "Advanced" in the app
    And I press "Group" in the app
    And I press "Group 2" in the app
    Then I should find "Posting in group \"Group 2\"" in the app

    When I set the field "Subject" to "My third subject" in the app
    And I set the field "Message" to "An awesome message" in the app
    And I press "Post to forum" in the app
    Then I should find "Your post was successfully added" in the app
    But I should not find "My third subject" in the app

    When I press "Visible groups" in the app
    And I press "Group 2" in the app
    Then I should find "My third subject" in the app

  Scenario: Teacher can post a copy in all groups
    Given I entered the course "Course 1" as "teacher1" in the app
    And I press "Separate groups forum" in the app
    When I press "Separate groups" in the app
    And I press "Group 1" in the app
    And I press "Add discussion topic" in the app
    And I press "Advanced" in the app
    Then I should find "Post a copy to all groups" in the app
    And I should find "Posting in group \"Group 1\"" in the app

    When I press "Post a copy to all groups" in the app
    Then I should not find "Posting in group \"Group 1\"" in the app

    When I set the field "Subject" to "My happy subject" in the app
    And I set the field "Message" to "An awesome message" in the app
    And I press "Post to forum" in the app
    Then I should find "Your post was successfully added" in the app
    And I should find "My happy subject" in the app

    When I press "Separate groups" in the app
    And I press "Group 2" in the app
    Then I should find "My happy subject" in the app

    When I go back in the app
    And I press "Visible groups forum" in the app
    And I press "Visible groups" in the app
    And I press "Group 1" in the app
    And I press "Add discussion topic" in the app
    And I press "Advanced" in the app
    Then I should find "Post a copy to all groups" in the app
    And I should find "Posting in group \"Group 1\"" in the app

    When I press "Post a copy to all groups" in the app
    Then I should not find "Posting in group \"Group 1\"" in the app

    When I set the field "Subject" to "My happy subject" in the app
    And I set the field "Message" to "An awesome message" in the app
    And I press "Post to forum" in the app
    Then I should find "Your post was successfully added" in the app
    And I should find "My happy subject" in the app

    When I press "Visible groups" in the app
    And I press "Group 2" in the app
    Then I should find "My happy subject" in the app

  Scenario: New discussion not opened in tablet if not visible
    Given I entered the forum activity "Separate groups forum" on course "Course 1" as "teacher1" in the app
    And I change viewport size to "1200x640" in the app

    When I press "Separate groups" in the app
    And I press "Group 1" in the app
    And I press "Add discussion topic" in the app
    And I set the field "Subject" to "My happy subject" in the app
    And I set the field "Message" to "An awesome message" in the app
    And I press "Advanced" in the app
    And I press "Group" near "Advanced" in the app
    And I press "Group 2" in the app
    And I press "Post to forum" in the app
    Then I should not find "My happy subject" in the app
    And I should not find "An awesome message" inside the split-view content in the app

  Scenario: Prefetch
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Course downloads" in the app
    And I press "Download" within "Separate groups" "ion-item" in the app
    And I press "Download" within "Visible groups" "ion-item" in the app
    Then I should find "Downloaded" within "Separate groups" "ion-item" in the app
    And I should find "Downloaded" within "Visible groups" "ion-item" in the app

    When I go back in the app
    And I switch offline mode to "true"
    And I press "Separate groups forum" in the app
    Then I should find "Disc sep G1" in the app
    And I should be able to press "Add discussion topic" in the app

    When I press "Disc sep G1" in the app
    Then I should find "Disc sep G1" in the app
    And I should find "Disc sep G1 content" in the app

    When I go back 2 times in the app
    And I press "Visible groups forum" in the app
    Then I should find "Disc vis ALL" in the app
    And I should find "Disc vis G1" in the app
    And I should find "Disc vis G2" in the app
    And I should not be able to press "Add discussion topic" in the app
    And I should find "You do not have permission to add a new discussion topic for all participants." in the app

    When I press "Visible groups" in the app
    And I press "Group 1" in the app
    Then I should find "Forum not available in this sorting order" in the app
