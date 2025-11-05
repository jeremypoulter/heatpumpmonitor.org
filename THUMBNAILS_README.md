# Thumbnail System

This system generates multiple thumbnail sizes for uploaded system photos to improve performance and user experience.

## Features

- Automatic thumbnail generation for uploaded images
- Multiple size configurations (square and rectangular)
- JSON-based storage for thumbnail paths
- Fallback logic for missing thumbnails
- Support for JPEG, PNG, and WebP formats
- Both crop and fit modes for different use cases

## Configuration

The system generates three thumbnail sizes by default:

- **80x60**: Rectangular thumbnail with center cropping for admin photo lists
- **150x150**: Square thumbnail with aspect ratio preservation for general use
- **300x300**: Larger square thumbnail with aspect ratio preservation

## API Usage

### Upload Photo

When uploading a photo, thumbnails are automatically generated in the background.

### Get Photos

The API returns thumbnail information in the photos array:

```json
{
  "success": true,
  "photos": [
    {
      "id": "1",
      "original_filename": "heat_pump.jpg",
      "filename": "img_abc123.jpg",
      "thumbnails": [
        {
          "width": 80,
          "height": 60,
          "url": "theme/img/system/1/img_abc123_thumb_80x60.jpg"
        },
        {
          "width": 150,
          "height": 150,
          "url": "theme/img/system/1/img_abc123_thumb_150.jpg"
        },
        {
          "width": 300,
          "height": 300,
          "url": "theme/img/system/1/img_abc123_thumb_300.jpg"
        }
      ]
    }
  ]
}
```

### Frontend Usage

The client-side code can request specific thumbnail sizes:

```javascript
// Select best available thumbnail size (square)
var thumbnailUrl = selectThumbnail(photo, '150');

// For admin lists, use 80x60 rectangular thumbnails
var adminThumbnail = selectThumbnail(photo, '80x60');

// Can also specify dimensions directly
var customThumbnail = selectThumbnail(photo, 150, 150);
```

The `selectThumbnail()` function:

1. Tries to find exact dimensional match
2. Falls back to best fit available sizes
3. Uses original image as final fallback
4. Automatically handles both square ('150') and rectangular ('80x60') size requests

## Setup and Maintenance

### Database Update

Run the database update script to add the thumbnails JSON field:

```bash
php update_database.php
```

### Generate Thumbnails

The `generate_thumbnails.php` script provides a unified way to generate thumbnails for all images in the system. It intelligently handles both missing thumbnails and new thumbnail sizes in a single operation.

#### Basic Usage

```bash
# Generate missing/incomplete thumbnails for all systems (silent)
php generate_thumbnails.php

# Generate missing/incomplete thumbnails with verbose output
php generate_thumbnails.php --verbose

# Force regeneration of ALL thumbnails (useful for testing or after configuration changes)
php generate_thumbnails.php --force-all

# Process only a specific system
php generate_thumbnails.php --system-id 123

# Force regeneration for a specific system with verbose output
php generate_thumbnails.php --verbose --force-all --system-id 123
```

**Note**: By default, the script runs silently (no output) making it suitable for cron jobs. Use `--verbose` to see detailed progress and results.

#### Docker Usage

When running in Docker environment:

```bash
# Normal generation (missing/incomplete only) - silent
docker compose run --entrypoint /var/generate_thumbnails.php load_dev_env_data

# Normal generation with verbose output
docker compose run --entrypoint "/var/generate_thumbnails.php --verbose" load_dev_env_data

# Force regeneration of all thumbnails - silent
docker compose run --entrypoint "/var/generate_thumbnails.php --force-all" load_dev_env_data

# Force regeneration with verbose output
docker compose run --entrypoint "/var/generate_thumbnails.php --verbose --force-all" load_dev_env_data

# Process specific system
docker compose run --entrypoint "/var/generate_thumbnails.php --system-id 123" load_dev_env_data
```

#### How It Works

The script uses a unified approach that:

1. **Normal Mode** (default): Only processes images that have missing or incomplete thumbnails, skipping those that already have all expected thumbnail sizes
2. **Force Mode** (`--force-all`): Regenerates all thumbnails regardless of current state
3. **System Filtering** (`--system-id`): Optionally limits processing to images for a specific system

The script automatically detects:

- Images with no thumbnails
- Images with incomplete thumbnail sets (missing sizes)
- Images where thumbnail files have been deleted
- When new thumbnail sizes have been added to the configuration

#### Output

The script provides detailed reporting including:

- Total images processed
- Number of successful generations
- Number of failed generations  
- Number of skipped images (already complete)
- Any error messages encountered

### Automated Generation

Add to crontab for automatic thumbnail generation (runs silently):

```bash
0 2 * * * cd /path/to/app && php generate_thumbnails.php
```

For troubleshooting, you can run manually with verbose output:

```bash
php generate_thumbnails.php --verbose
```

## Technical Implementation

### ThumbnailGenerator Class

- Uses PHP GD extension for image processing
- Supports JPEG, PNG, and WebP formats
- Generates thumbnails with JPEG quality of 85%
- Preserves transparency for PNG and WebP images
- Supports both 'fit' (aspect ratio preserved) and 'crop' (exact dimensions) modes
- Implements center cropping for exact rectangular dimensions

### File Naming Convention

- Original: `img_abc123.jpg`
- Thumbnails: `img_abc123_thumb_150.jpg`, `img_abc123_thumb_300.jpg`, `img_abc123_thumb_80x60.jpg`

### Adding New Sizes

To add new thumbnail sizes, modify the `$sizes` array in the `ThumbnailGenerator` class:

```php
private $sizes = [
    [80, 60, '_thumb_80x60', '80x60', 'crop'],     // Admin list thumbnail (cropped)
    [150, 150, '_thumb_150', '150', 'fit'],        // Small thumbnail (aspect preserved)
    [300, 300, '_thumb_300', '300', 'fit'],        // Medium thumbnail (aspect preserved)
    [500, 500, '_thumb_500', '500', 'fit'],        // New size example
];
```

Each entry contains: `[width, height, suffix, key, mode]`

- **width/height**: Pixel dimensions
- **suffix**: File suffix for the thumbnail
- **key**: Key used in the JSON thumbnails object
- **mode**: 'crop' for exact dimensions, 'fit' for aspect ratio preservation

### Error Handling

- Thumbnail generation failures don't block image uploads
- Missing thumbnails gracefully fall back to original images
- Script can be re-run safely to generate missing thumbnails
- Logs errors for debugging

## Database Schema

The `system_images` table includes a single `thumbnails` JSON field:

```sql
ALTER TABLE system_images 
ADD COLUMN thumbnails JSON DEFAULT NULL;
```

**Optimized Storage Format** (both database and API use the same format):

```json
[
  {
    "width": 80,
    "height": 60,
    "url": "theme/img/system/1/img_abc123_thumb_80x60.jpg"
  },
  {
    "width": 150,
    "height": 150,
    "url": "theme/img/system/1/img_abc123_thumb_150.jpg"
  },
  {
    "width": 300,
    "height": 300,
    "url": "theme/img/system/1/img_abc123_thumb_300.jpg"
  }
]
```

**Benefits of this approach:**

- ✅ **No separate flag column needed** - thumbnail existence determined by JSON content
- ✅ **Flexible for new sizes** - just add to configuration and regenerate
- ✅ **Self-documenting** - explicit dimensions for each thumbnail
- ✅ **File verification** - can check if thumbnail files actually exist
- ✅ **Version resilient** - handles missing/corrupted thumbnail files gracefully

## Benefits

- Faster page loading with appropriately sized images
- Reduced bandwidth usage
- Better user experience on mobile devices
- Reduced server load for image serving
- Consistent image dimensions for UI layouts
- Support for both square and rectangular thumbnail requirements
