# Moodle App Download Page Plugin (local_appdownload)

A Moodle local plugin that provides a publicly accessible app download page for mobile app promotion and Moodle mobile settings configuration.

## Purpose

This plugin creates a public app download page that can be accessed without login, which can be used for:
- Moodle mobile app banner configuration (App download page setting)
- Direct links from emails or website
- App store listing requirements

## Features

- **Public Access**: No login required - accessible to anyone with the URL
- **Mobile-Friendly**: Responsive design compatible with all devices
- **Store Badges**: Links to App Store and Google Play with official badges
- **Customizable**: Easy to modify content via language strings

## Installation

### Method 1: Manual Installation

1. Copy the `local_appdownload` folder to your Moodle's `local` directory:
   ```bash
   cp -r local_appdownload /path/to/your/moodle/local/
   ```

2. Store badges are already included in the `pix/` folder

3. Log in to your Moodle site as an administrator

4. Navigate to: **Site administration** → **Notifications**

5. Follow the prompts to install the plugin

## Configuration

### Update URLs (if needed)

Edit `lang/en/local_appdownload.php` and update:
- `appstore_url` - Your App Store link
- `playstore_url` - Your Google Play link

Current configuration:
- **App Store**: https://apps.apple.com/us/app/aspire-school/id6754192155
- **Google Play**: https://play.google.com/store/apps/details?id=org.aspireschool.aspire

## Usage

### Accessing the Download Page

Once installed, the download page will be accessible at:

```
https://learn.aspireschool.org/local/appdownload/download.php
```

### Moodle Mobile Settings

Use this URL in Moodle mobile app settings:

1. Go to: **Site administration** → **Mobile app** → **Mobile settings**
2. Set **App download page** to: `https://learn.aspireschool.org/local/appdownload/download.php`
3. Set **iOS app's unique identifier** to: `6754192155`
4. Set **Android app's unique identifier** to: `org.aspireschool.aspire`
5. Enable **App Banners** if desired

## File Structure

```
local_appdownload/
├── version.php                      # Plugin metadata
├── download.php                     # Public download page
├── styles.css                       # Page styling
├── pix/
│   ├── app-icon.png                 # App icon (included)
│   ├── appstore-badge.svg           # App Store badge
│   └── googleplay-badge.svg         # Google Play badge
├── lang/
│   └── en/
│       └── local_appdownload.php    # English language strings
└── README.md                        # This file
```

## Customization

### Updating Content

Edit `lang/en/local_appdownload.php` to change:
- App name and tagline
- Description
- Features list
- Requirements
- Support contact info
- Version number

### Styling

Edit `styles.css` to customize the appearance. The main brand color is `#4A9B8E` (Aspire teal).

## Requirements

- Moodle 4.0 or later
- No additional dependencies

## Troubleshooting

### Page requires login

If the page is asking for login:
- Verify that `define('NO_MOODLE_COOKIES', true);` is present in `download.php`
- Check Moodle's force login setting

### Images not loading

- Ensure badge files exist in `pix/` folder
- Check file permissions
- Verify file names match those in `download.php`

### Content not updating

Clear Moodle caches:
- **Site administration** → **Development** → **Purge all caches**

## App Store IDs

For reference, here are your app identifiers:

| Platform | Identifier |
|----------|------------|
| iOS App Store ID | `6754192155` |
| Android Package | `org.aspireschool.aspire` |

## License

This plugin is licensed under the GNU GPL v3 or later.

## Version History

- **1.0.0** (2025-01-27): Initial release
