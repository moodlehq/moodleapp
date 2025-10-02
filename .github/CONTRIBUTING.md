# Contributing to Moodle App

[Moodle][1] is made by people like you. We are members of a big worldwide community of developers, designers, teachers, testers, translators and many more. We work in universities, schools, companies and other places. You are very welcome to join us and contribute to the project.

There are many ways that you can contribute to Moodle App, not just through development. See our [development guide][2] for some of the many ways that you can help.

## Github

All issues should be reported via, and patched provided to the [Moodle Tracker][3].

You have to create a fork of the Moodle App [Github repository][4] and there you should create branches with the Moodle Tracker issue id (MOBILE-XXXX).

> [!IMPORTANT]
> Please do not publish security issues, or patches releating to them publicly.
> See our [Responsible Disclosure Policy][5] for more information.


## Moodle App plugins

Moodle has a framework for additional plugins to extend its functionality. We
have a Moodle plugins directory <https://moodle.org/plugins/> where you can
register and maintain your plugin. Plugins hosted in the plugins directory can
be easily installed and updated via the Moodle administration interface, but you have to take care to make plugins compatible with the Moodle App. To help with this we have a [guideline][6] to develop plugins compabible with the Moodle App.

* You are expected to have a public source code repository with your plugin
  code.
* After registering your plugin in the plugins directory it is reviewed before
  being published.
* You are expected to continuously release updated versions of the plugin via
  the plugins directory. We do not pull from your code repository; you must do
  it explicitly.

For further details, see <https://moodledev.io/general/community/plugincontribution>.

[1]: https://moodle.org
[2]: https://moodledev.io/general/app/development/development-guide
[3]: https://moodle.atlassian.net
[4]: https://github.com/moodlehq/moodleapp
[5]: https://moodledev.io/general/development/process/security
[6]: https://moodledev.io/general/app/development/plugins-development-guide
