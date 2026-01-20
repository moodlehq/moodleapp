@app_parallel_run_data @addon_mod_data @app @mod @mod_data @javascript
Feature: Users can manage entries in database activities
  In order to create databases
  As a user
  I need to add entries with links to databases

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email                |
      | teacher1 | Teacher   | 1        | teacher1@example.com |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1        | 0        |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | teacher1 | C1     | editingteacher |
    And the following "activities" exist:
      | activity | name               | intro          | course | idnumber |
      | data     | Test database name | Database intro | C1     | data1    |
    And the following "mod_data > fields" exist:
      | database | type | name          | description    |
      | data1    | text | Email-Adresse | Repeated entry |
    And the following "mod_data > entries" exist:
      | database | Email-Adresse   |
      | data1    | test@moodle.com |
    And I am on the "Test database name" "data activity" page logged in as teacher1
    And I navigate to "Templates" in current page administration
    And I set the field "Templates tertiary navigation" to "List view template"

  @javascript
  Scenario: Create links in list template
    Given I set the following fields to these values:
      | Repeated entry | <div class="colleague-entry-value mt-4"><span class="colleague-entry-value-title font-weight-bold">[[Email-Adresse#name]]</span><p><a href="mailto:[[Email-Adresse]]">Mail: [[Email-Adresse]]</a></p></div> |
    And I click on "Save" "button" in the "sticky-footer" "region"

    And I entered the data activity "Test database name" on course "Course 1" as "teacher1" in the app
    And I should find "test@moodle.com" in the app
    And the "href" attribute of ".colleague-entry-value p a" "css_element" should contain "mailto:test@moodle.com"
