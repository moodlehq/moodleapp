# Moodle Privacy Policy Plugin (local_privacypolicy)

A Moodle local plugin that provides a publicly accessible privacy policy page for mobile app Play Store/App Store requirements.

## Purpose

This plugin creates a public privacy policy page that can be accessed without login, which is required for mobile app submissions to:
- Google Play Store
- Apple App Store
- Other app marketplaces

## Features

- **Public Access**: No login required - accessible to anyone with the URL
- **Mobile-Friendly**: Responsive design compatible with all devices
- **Customizable**: Easy to modify privacy policy content via language strings
- **Standards Compliant**: Follows Moodle coding standards and best practices

## Installation

### Method 1: Manual Installation

1. Copy the `local_privacypolicy` folder to your Moodle's `local` directory:
   ```bash
   cp -r local_privacypolicy /path/to/your/moodle/local/
   ```

2. Log in to your Moodle site as an administrator

3. Navigate to: **Site administration** → **Notifications**

4. Follow the prompts to install the plugin

### Method 2: ZIP Installation

1. Create a ZIP file of the plugin:
   ```bash
   cd local_privacypolicy
   zip -r local_privacypolicy.zip .
   ```

2. Log in to your Moodle site as an administrator

3. Navigate to: **Site administration** → **Plugins** → **Install plugins**

4. Upload the ZIP file and follow the installation prompts

## Usage

### Accessing the Privacy Policy Page

Once installed, the privacy policy page will be accessible at:

```
https://learn.aspireschool.org/local/privacypolicy/privacy.php
```

**Important:** This URL should be used in your mobile app store listings.

### Customizing the Content

To customize the privacy policy content:

1. Navigate to the language strings file:
   - Path: `local/privacypolicy/lang/en/local_privacypolicy.php`

2. Edit the section descriptions (search for strings ending with `_desc`):
   - `section_datacollection_desc` - Information you collect
   - `section_datausage_desc` - How you use the data
   - `section_datastorage_desc` - Data storage and security
   - `section_thirdparty_desc` - Third-party services
   - `section_userrights_desc` - User rights
   - `section_contact_desc` - Contact information

3. Save your changes

4. Clear Moodle caches:
   - **Site administration** → **Development** → **Purge all caches**
   - Or run: `php admin/cli/purge_caches.php`

### For App Store Submission

When submitting your mobile app, provide the public URL:

**Privacy Policy URL:**
```
https://learn.aspireschool.org/local/privacypolicy/privacy.php
```

## Important Customization Notes

### Required Changes Before Publishing

**You should review and customize the following:**

1. **Contact Information** (in `section_contact_desc`):
   - Email is set to: privacy@aspireschool.org
   - Institution: Aspire School
   - Moodle site: learn.aspireschool.org
   - Update contact email if different from privacy@aspireschool.org

2. **Data Collection Details**:
   - Review and update what data your app actually collects
   - Add or remove items based on your specific implementation

3. **Third-Party Services**:
   - List all third-party services your app uses (Firebase, Analytics, etc.)
   - Include links to their privacy policies

4. **Copyright Information** (in `version.php`):
   - Update the copyright year and organization name

### Legal Disclaimer

This plugin provides a template privacy policy. **It is not legal advice.**

You should:
- Have your privacy policy reviewed by legal counsel
- Ensure compliance with applicable privacy laws (GDPR, COPPA, CCPA, etc.)
- Update the policy to reflect your actual data practices
- Keep the policy up to date as your app changes

## File Structure

```
local_privacypolicy/
├── version.php                      # Plugin metadata
├── privacy.php                      # Public privacy policy page
├── lang/
│   └── en/
│       └── local_privacypolicy.php  # English language strings
└── README.md                        # This file
```

## Requirements

- Moodle 4.0 or later
- No additional dependencies

## Verification

To verify the plugin is working correctly:

1. Open a private/incognito browser window (to test without login)
2. Navigate to: `https://learn.aspireschool.org/local/privacypolicy/privacy.php`
3. Verify the page loads without requiring login
4. Check that all content displays correctly

## Troubleshooting

### Page requires login

If the page is asking for login:
- Verify that `define('NO_LOGIN', '1');` is present in `privacy.php`
- Check Moodle's force login setting: **Site administration** → **Security** → **Site policies**
- Ensure the file is in the correct location: `local/privacypolicy/privacy.php`

### Content not updating

If changes to language strings aren't appearing:
- Purge all caches: **Site administration** → **Development** → **Purge all caches**
- Or use CLI: `php admin/cli/purge_caches.php`

### 404 Error

If the page shows a 404 error:
- Verify the plugin is installed correctly
- Check file permissions are correct (readable by web server)
- Ensure the URL path is correct

## Support

For issues with this plugin:
- Check the Moodle logs: **Site administration** → **Reports** → **Logs**
- Review Moodle debugging output: **Site administration** → **Development** → **Debugging**

## License

This plugin is licensed under the GNU GPL v3 or later.

## Version History

- **1.0.0** (2025-10-27): Initial release
  - Public privacy policy page
  - Customizable content via language strings
  - No login required for access
