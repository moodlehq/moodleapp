@app_parallel_run_glossary @addon_block_glossary_random @app @block @block_glossary_random @javascript
Feature: Basic tests of glossay random block

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email | idnumber |
      | student1 | Student | 1 | student1@example.com | S1 |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1 | 0 |
    And the following "course enrolments" exist:
      | user     | course | role |
      | student1 | C1 | student |
    And the following "activities" exist:
      | activity | name    | intro              | course | defaultapproval |
      | glossary | Animals | An animal glossary | C1     | 1               |
    And the following "mod_glossary > entries" exist:
      | glossary | user     | concept   | definition |
      | Animals  | student1 | Aardvark  | Erdferkel  |
      | Animals  | student1 | Kangaroo  | Känguru    |
      | Animals  | student1 | Zebra     | Zebra      |
    And the following "blocks" exist:
      | blockname          | contextlevel | reference | pagetypepattern | defaultregion |
      | glossary_random    | Course       | C1        | course-view-*   | side-pre      |
    And I log in as "admin"
    And I am on "Course 1" course homepage with editing mode on
    And I configure the "block_glossary_random" block
    And I set the following fields to these values:
      | Title                           | Animal of the day   |
      | Take entries from this glossary | Animals             |
      | How a new entry is chosen       | Last modified entry |
    And I press "Save changes"

  Scenario: View and navigate the glossay random block in a course
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Open block drawer" in the app
    Then I should find "Animal of the day" in the app
    And I should find "Zebra" in the app
    And I should not find "Aardvark" in the app
    And I should not find "Kangaroo" in the app
    When I press "View all entries" in the app
    Then the header should be "Animals" in the app
    And I should find "Aardvark" in the app
    And I should find "Kangaroo" in the app
    And I should find "Zebra" in the app
    When I go back in the app
    And I press "Open block drawer" in the app
    And I press "Add a new entry" in the app
    Then the header should be "Animals" in the app
    When I set the following fields to these values in the app:
      | Concept    | Donkey |
      | Definition | Esel   |
    And I press "Save" in the app
    And I press "Open block drawer" in the app
    And I pull to refresh in the app
    Then I should find "Animal of the day" in the app
    And I should find "Donkey" in the app
    And I should not find "Zebra" in the app
    And I should not find "Aardvark" in the app
    And I should not find "Kangaroo" in the app

  Scenario: Block is included in disabled features
    # Add another block just to ensure there is something in the block region and the drawer is displayed.
    Given the following "blocks" exist:
      | blockname        | contextlevel | reference | pagetypepattern | defaultregion | configdata                                                                                                   |
      | html             | Course       | C1        | course-view-*   | side-pre      | Tzo4OiJzdGRDbGFzcyI6Mjp7czo1OiJ0aXRsZSI7czoxNToiSFRNTCB0aXRsZSB0ZXN0IjtzOjQ6InRleHQiO3M6OToiYm9keSB0ZXN0Ijt9 |
    And the following config values are set as admin:
      | disabledfeatures | CoreBlockDelegate_AddonBlockGlossaryRandom | tool_mobile |
    And  I entered the course "Course 1" as "student1" in the app
    When I press "Open block drawer" in the app
    Then I should not find "Animal of the day" in the app
