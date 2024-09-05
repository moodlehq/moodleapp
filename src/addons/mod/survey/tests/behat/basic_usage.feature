@addon_mod_survey @app @javascript
Feature: Test basic usage of survey activity in app
  In order to participate in surveys while using the mobile app
  As a student
  I need basic survey functionality to work

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
    And I enable "survey" "mod" plugin
    And the following "activities" exist:
      | activity | name             | intro       | course | idnumber | groupmode |
      | survey   | Test survey name | Test survey | C1     | survey   | 0         |

  Scenario: Answer a survey & View results (ATTLS)
    Given I entered the survey activity "Test survey name" on course "Course 1" as "student1" in the app
    And I set the following fields to these values in the app:
      | 1. In evaluating what someone says, I focus on the quality of their argument, not on the person who's presenting it. | Strongly agree |
      | 2. I like playing devil's advocate - arguing the opposite of what someone is saying. | Strongly disagree |
      | 3. I like to understand where other people are 'coming from', what experiences have led them to feel the way they do. | Somewhat agree |
      | 4. The most important part of my education has been learning to understand people who are very different to me. | Somewhat disagree |
      | 5. I feel that the best way for me to achieve my own identity is to interact with a variety of other people. | Somewhat agree |
      | 6. I enjoy hearing the opinions of people who come from backgrounds different to mine - it helps me to understand how the same things can be seen in such different ways. | Somewhat agree |
      | 7. I find that I can strengthen my own position through arguing with someone who disagrees with me. | Somewhat agree |
      | 8. I am always interested in knowing why people say and believe the things they do. | Somewhat agree |
      | 9. I often find myself arguing with the authors of books that I read, trying to logically figure out why they're wrong. | Somewhat agree |
      | 10. It's important for me to remain as objective as possible when I analyze something. | Somewhat agree |
      | 11. I try to think with people instead of against them. | Somewhat agree |
      | 12. I have certain criteria I use in evaluating arguments. | Somewhat agree |
      | 13. I'm more likely to try to understand someone else's opinion than to try to evaluate it. | Somewhat agree |
      | 14. I try to point out weaknesses in other people's thinking to help them clarify their arguments. | Somewhat agree |
      | 15. I tend to put myself in other people's shoes when discussing controversial issues, to see why they think the way they do. | Somewhat agree |
      | 16. One could call my way of analysing things 'putting them on trial' because I am careful to consider all the evidence. | Somewhat agree |
      | 17. I value the use of logic and reason over the incorporation of my own concerns when solving problems. | Somewhat agree |
      | 18. I can obtain insight into opinions that differ from mine through empathy. | Somewhat agree |
      | 19. When I encounter people whose opinions seem alien to me, I make a deliberate effort to 'extend' myself into that person, to try to see how they could have those opinions. | Somewhat agree |
      | 20. I spend time figuring out what's 'wrong' with things. For example, I'll look for something in a literary interpretation that isn't argued well enough. | Somewhat agree |
    And I press "Submit" in the app
    And I press "OK" in the app
    And I press "Results" in the app
    And I press "OK" in the app
    And I switch to the browser tab opened by the app
    And I log in as "student1"
    Then I should see "You've completed this survey.  The graph below shows a summary of your results compared to the class averages."
    And I should see "1 people have completed this survey so far"
    And the following events should have been logged for "student1" in the app:
      | name                                   | activity | activityname     | course   |
      | \mod_survey\event\course_module_viewed | survey   | Test survey name | Course 1 |
      | \mod_survey\event\response_submitted   | survey   | Test survey name | Course 1 |

  Scenario: Answer a survey & View results (Critical incidents)
    Given the following "activities" exist:
      | activity | name                           | intro        | template |course | idnumber | groupmode |
      | survey   | Test survey critical incidents | Test survey1 | 5        | C1    | survey1  | 0         |
    Given I entered the survey activity "Test survey critical incidents" on course "Course 1" as "student1" in the app
    And I set the following fields to these values in the app:
      | At what moment in class were you most engaged as a learner? | 1st answer |
      | At what moment in class were you most distanced as a learner? | 2nd answer |
      | What action from anyone in the forums did you find most affirming or helpful? | 3rd answer |
      | What action from anyone in the forums did you find most puzzling or confusing? | 4th answer |
      | What event surprised you most? | 5th answer |
    And I press "Submit" in the app
    And I press "OK" in the app
    Then I should see "Results"

    When I press "Results" in the app
    And I press "OK" in the app
    And I switch to the browser tab opened by the app
    And I log in as "student1"
    Then I should see "Test survey critical incidents"
    And I should see "1st answer"
    And I should see "2nd answer"
    And I should see "3rd answer"
    And I should see "4th answer"
    And I should see "5th answer"

  Scenario: Answer a survey & View results (Colles actual)
    Given the following "activities" exist:
      | activity | name                        | intro        | template |course | idnumber | groupmode |
      | survey   | Test survey Colles (actual) | Test survey1 | 1        | C1    | survey1  | 0         |
    Given I entered the survey activity "Test survey Colles (actual)" on course "Course 1" as "student1" in the app
    And I set the following fields to these values in the app:
      | 1. my learning focuses on issues that interest me. | Sometimes |
      | 2. what I learn is important for my professional practice. | Sometimes |
      | 3. I learn how to improve my professional practice. | Sometimes |
      | 4. what I learn connects well with my professional practice. | Sometimes |
      | 5. I think critically about how I learn. | Sometimes |
      | 6. I think critically about my own ideas. | Sometimes |
      | 7. I think critically about other students' ideas. | Sometimes |
      | 8. I think critically about ideas in the readings. | Sometimes |
      | 9. I explain my ideas to other students. | Sometimes |
      | 10. I ask other students to explain their ideas. | Sometimes |
      | 11. other students ask me to explain my ideas. | Sometimes |
      | 12. other students respond to my ideas. | Sometimes |
      | 13. the tutor stimulates my thinking. | Sometimes |
      | 14. the tutor encourages me to participate. | Sometimes |
      | 15. the tutor models good discourse. | Sometimes |
      | 16. the tutor models critical self-reflection. | Sometimes |
      | 17. other students encourage my participation. | Sometimes |
      | 18. other students praise my contribution. | Sometimes |
      | 19. other students value my contribution. | Sometimes |
      | 20. other students empathise with my struggle to learn. | Sometimes |
      | 21. I make good sense of other students' messages. | Sometimes |
      | 22. other students make good sense of my messages. | Sometimes |
      | 23. I make good sense of the tutor's messages. | Sometimes |
      | 24. the tutor makes good sense of my messages. | Sometimes |
      | 25. How long did this survey take you to complete? | under 1 min |
    And I press "Submit" in the app
    And I press "OK" in the app
    Then I should see "You have completed this survey"

    When I press "Results" in the app
    And I press "OK" in the app
    And I switch to the browser tab opened by the app
    And I log in as "student1"
    Then I should see "You've completed this survey.  The graph below shows a summary of your results compared to the class averages."
    And I should see "1 people have completed this survey so far"

  Scenario: Answer a survey & View results (Colles preferred)
    Given the following "activities" exist:
      | activity | name                           | intro        | template | course | idnumber | groupmode |
      | survey   | Test survey Colles (preferred) | Test survey1 | 2        | C1     | survey1  | 0         |
    Given I entered the survey activity "Test survey Colles (preferred)" on course "Course 1" as "student1" in the app
    And I set the following fields to these values in the app:
      | 1. my learning focuses on issues that interest me. | Sometimes |
      | 2. what I learn is important for my professional practice. | Sometimes |
      | 3. I learn how to improve my professional practice. | Sometimes |
      | 4. what I learn connects well with my professional practice. | Sometimes |
      | 5. I think critically about how I learn. | Sometimes |
      | 6. I think critically about my own ideas. | Sometimes |
      | 7. I think critically about other students' ideas. | Sometimes |
      | 8. I think critically about ideas in the readings. | Sometimes |
      | 9. I explain my ideas to other students. | Sometimes |
      | 10. I ask other students to explain their ideas. | Sometimes |
      | 11. other students ask me to explain my ideas. | Sometimes |
      | 12. other students respond to my ideas. | Sometimes |
      | 13. the tutor stimulates my thinking. | Sometimes |
      | 14. the tutor encourages me to participate. | Sometimes |
      | 15. the tutor models good discourse. | Sometimes |
      | 16. the tutor models critical self-reflection. | Sometimes |
      | 17. other students encourage my participation. | Sometimes |
      | 18. other students praise my contribution. | Sometimes |
      | 19. other students value my contribution. | Sometimes |
      | 20. other students empathise with my struggle to learn. | Sometimes |
      | 21. I make good sense of other students' messages. | Sometimes |
      | 22. other students make good sense of my messages. | Sometimes |
      | 23. I make good sense of the tutor's messages. | Sometimes |
      | 24. the tutor makes good sense of my messages. | Sometimes |
      | 25. How long did this survey take you to complete? | under 1 min |
    And I press "Submit" in the app
    And I press "OK" in the app
    Then I should see "You have completed this survey"

    When I press "Results" in the app
    And I press "OK" in the app
    And I switch to the browser tab opened by the app
    And I log in as "student1"
    Then I should see "You've completed this survey.  The graph below shows a summary of your results compared to the class averages."
    And I should see "1 people have completed this survey so far"

  Scenario: Answer a survey & View results (Colles preferred and actual)
    Given the following "activities" exist:
      | activity | name                                      | intro        | template | course | idnumber | groupmode |
      | survey   | Test survey Colles (preferred and actual) | Test survey1 | 3        | C1     | survey1  | 0         |
    Given I entered the survey activity "Test survey Colles (preferred and actual)" on course "Course 1" as "student1" in the app
    And I set the following fields to these values in the app:
      | 1. I prefer that my learning focuses on issues that interest me. | Sometimes |
      | 2. I found that my learning focuses on issues that interest me. | Sometimes |
      | 3. I prefer that what I learn is important for my professional practice. | Sometimes |
      | 4. I found that what I learn is important for my professional practice. | Sometimes |
      | 5. I prefer that I learn how to improve my professional practice. | Sometimes |
      | 6. I found that I learn how to improve my professional practice. | Sometimes |
      | 7. I prefer that what I learn connects well with my professional practice. | Sometimes |
      | 8. I found that what I learn connects well with my professional practice. | Sometimes |
      | 9. I prefer that I think critically about how I learn. | Sometimes |
      | 10. I found that I think critically about how I learn. | Sometimes |
      | 11. I prefer that I think critically about my own ideas. | Sometimes |
      | 12. I found that I think critically about my own ideas. | Sometimes |
      | 13. I prefer that I think critically about other students' ideas. | Sometimes |
      | 14. I found that I think critically about other students' ideas. | Sometimes |
      | 15. I prefer that I think critically about ideas in the readings. | Sometimes |
      | 16. I found that I think critically about ideas in the readings. | Sometimes |
      | 17. I prefer that I explain my ideas to other students. | Sometimes |
      | 18. I found that I explain my ideas to other students. | Sometimes |
      | 19. I prefer that I ask other students to explain their ideas. | Sometimes |
      | 20. I found that I ask other students to explain their ideas. | Sometimes |
      | 21. I prefer that other students ask me to explain my ideas. | Sometimes |
      | 22. I found that other students ask me to explain my ideas. | Sometimes |
      | 23. I prefer that other students respond to my ideas. | Sometimes |
      | 24. I found that other students respond to my ideas. | Sometimes |
      | 25. I prefer that the tutor stimulates my thinking. | Sometimes |
      | 26. I found that the tutor stimulates my thinking. | Sometimes |
      | 27. I prefer that the tutor encourages me to participate. | Sometimes |
      | 28. I found that the tutor encourages me to participate. | Sometimes |
      | 29. I prefer that the tutor models good discourse. | Sometimes |
      | 30. I found that the tutor models good discourse. | Sometimes |
      | 31. I prefer that the tutor models critical self-reflection. | Sometimes |
      | 32. I found that the tutor models critical self-reflection. | Sometimes |
      | 33. I prefer that other students encourage my participation. | Sometimes |
      | 34. I found that other students encourage my participation. | Sometimes |
      | 35. I prefer that other students praise my contribution. | Sometimes |
      | 36. I found that other students praise my contribution. | Sometimes |
      | 37. I prefer that other students value my contribution. | Sometimes |
      | 38. I found that other students value my contribution. | Sometimes |
      | 39. I prefer that other students empathise with my struggle to learn. | Sometimes |
      | 40. I found that other students empathise with my struggle to learn. | Sometimes |
      | 41. I prefer that I make good sense of other students' messages. | Sometimes |
      | 42. I found that I make good sense of other students' messages. | Sometimes |
      | 43. I prefer that other students make good sense of my messages. | Sometimes |
      | 44. I found that other students make good sense of my messages. | Sometimes |
      | 45. I prefer that I make good sense of the tutor's messages. | Sometimes |
      | 46. I found that I make good sense of the tutor's messages. | Sometimes |
      | 47. I prefer that the tutor makes good sense of my messages. | Sometimes |
      | 48. I found that the tutor makes good sense of my messages. | Sometimes |
      | 49. How long did this survey take you to complete? | 1-2 min |
    And I press "Submit" in the app
    And I press "OK" in the app
    Then I should see "You have completed this survey"

    When I press "Results" in the app
    And I press "OK" in the app
    And I switch to the browser tab opened by the app
    And I log in as "student1"
    Then I should see "You've completed this survey.  The graph below shows a summary of your results compared to the class averages."
    And I should see "1 people have completed this survey so far"

  Scenario: Answer survey offline & Sync survey
    Given the following "activities" exist:
      | activity | name                           | intro        | template | course | idnumber | groupmode |
      | survey   | Test survey critical incidents | Test survey1 | 5        | C1     | survey1  | 0         |
    Given I entered the survey activity "Test survey critical incidents" on course "Course 1" as "student1" in the app
    And I switch network connection to offline
    And I press "Submit" in the app
    And I press "OK" in the app
    Then I should see "This Survey has offline data to be synchronised."

    When I switch network connection to wifi
    And I go back in the app
    And I press "Test survey critical incidents" in the app
    And I press "Information" in the app
    And I press "Refresh" in the app
    Then I should see "Results"
    And I should see "You have completed this survey."
    But I should not see "This Survey has offline data to be synchronised."

  Scenario: Prefetch & Auto-sync survey
    Given the following "activities" exist:
      | activity | name                           | intro        | template | course | idnumber | groupmode |
      | survey   | Test survey critical incidents | Test survey1 | 5        | C1     | survey1  | 0         |
    Given I entered the course "Course 1" as "student1" in the app
    And I press "Course downloads" in the app
    And I press "Download" within "Test survey critical incidents" "ion-item" in the app
    And I go back in the app
    And I switch network connection to offline
    And I press "Test survey name" in the app
    Then I should see "There was a problem connecting to the site. Please check your connection and try again."

    When I press "OK" in the app
    And I go back in the app
    And I press "Test survey critical incidents" in the app
    And I press "Submit" in the app
    And I press "OK" in the app
    Then I should see "This Survey has offline data to be synchronised."

    When I switch network connection to wifi
    And I run cron tasks in the app
    Then I should not see "This Survey has offline data to be synchronised."
    And I should see "You have completed this survey."
