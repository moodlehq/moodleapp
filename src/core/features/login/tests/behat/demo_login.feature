@app_parallel_run_login @core_login @app @core @javascript
Feature: Test basic usage of login in app
  I need basic login functionality to work

Background:
    Given the following "users" exist:
      | username | firstname | lastname |
      | student | Student    | First    |
    And the app has the following config:
      | demo_sites | {"student":{"url":"$WWWROOT","username":"student","password":"student"}} |

  Scenario: Login with student demo account
    When I launch the app
    And I set the field "Your site" to "student" in the app
    And I press "Connect to your site" in the app
    Then the header should be "Acceptance test site" in the app
