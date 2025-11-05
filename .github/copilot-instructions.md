# Copilot Instructions for HeatpumpMonitor.org

## Project Overview
HeatpumpMonitor.org is a PHP-based web application for sharing and comparing heat pump performance data. It features a lightweight custom MVC framework with a modular architecture built for displaying energy data from linked Emoncms installations.

## Architecture & Framework

### Custom MVC Structure
- **Entry Point**: `www/index.php` - front controller handling all requests via routing
- **Routing**: `www/route.php` - URL parsing and controller dispatch
- **Core Functions**: `www/core.php` - utilities for HTTP helpers, views, sessions
- **Modules**: `www/Modules/{module}/` - self-contained features with controller/model/view pattern

### Key Architectural Patterns
- **Modules are self-contained**: Each in `www/Modules/{name}/` with:
  - `{name}_controller.php` - handles routes like `/system/view?id=123`
  - `{name}_model.php` - database operations and business logic
  - `{name}_schema.php` - database table definitions
  - Views in `views/` or inline in controller
- **Database schemas**: Defined in `{module}_schema.php` files, not migrations
- **Auto-loading**: Controllers dynamically loaded based on URL segments
- **Global objects**: Core models (`$system`, `$user`, `$system_stats`) initialized in `index.php`

## Development Workflows

### Local Development
```bash
# Docker setup (recommended)
docker compose build && docker compose up
# Access at http://localhost:8080
# Default login: admin/admin (dev mode)

# Load/update sample data and database schema
docker compose run load_dev_env_data

# Manual setup
cp www/example.settings.php www/settings.php
# Edit database credentials
```

### Database Management
- **Schema**: Defined in `Modules/{name}/{name}_schema.php` files
- **Setup**: Uses `www/Lib/dbschemasetup.php` for table creation/updates
- **Migration**: Docker service `load_dev_env_data` handles database schema updates and sample data loading
- **Sample Data**: `docker compose run load_dev_env_data` populates development environment
- **No migrations**: Schema changes are applied by modifying schema files and running the Docker service
- **Database Access**: `docker compose exec db mariadb -u heatpumpmonitor -p"heatpumpmonitor" heatpumpmonitor`
- **Schema Queries**: Use SQL commands to check table structure and data during development

### File Upload System
- **Photos**: Stored in `www/theme/img/system/{system_id}/`
- **Thumbnails**: Auto-generated using `ThumbnailGenerator` class
- **Validation**: 5MB limit, JPG/PNG/WebP only, max 4 photos per system
- **Photo Types**: Supports categorized uploads (`outdoor_unit`, `plant_room`, `other`)
- **Management**: CLI script `generate_thumbnails.php` for batch processing
- **Admin Interface**: `/system/photos/admin` for managing all uploaded photos

## Data Architecture

### Primary Models
- **System** (`system_meta` table): Heat pump installations with technical specs
- **User** (`users` table): Authentication and system ownership
- **SystemStats** (`system_stats_*` tables): Performance data aggregated from Emoncms
- **SystemPhotos** (`system_images` table): Photo uploads with JSON thumbnail metadata and photo_type categorization

### External Integration
- **Emoncms**: Remote data source via API (`$settings['emoncms_host']`)
- **System linking**: Each system has `app_id` and `readkey` for data access
- **Caching**: Redis for performance data (optional, gracefully degrades)

## UI & Frontend

### Technology Stack
- **Vue.js 2**: Interactive components with global `Vue` instance
- **Bootstrap 5.3.0**: CSS framework for responsive design (use `bg-*` classes for badges, not `badge-*`)
- **Axios**: HTTP client for API calls
- **Custom CSS**: Module-specific styles in `{module}_view.css`

### Component Patterns
- **Mixins**: Reusable Vue functionality in `Modules/system/photo_*.js`
  - `PhotoLightboxMixin`: Gallery viewing with keyboard navigation
  - `PhotoUploadMixin`: Drag-drop upload with progress tracking
- **Template Includes**: Shared HTML in `photo_lightbox_template.html`
- **Utility Libraries**: `PhotoUtils` for thumbnail selection and file validation

## Photo Upload System Architecture

### Database Schema
- **Table**: `system_images` in `system_schema.php`
- **Key Fields**: 
  - `photo_type` varchar(50) with default 'other'
  - `image_path`, `original_filename`, `thumbnails` (JSON)
  - `system_id` for linking to heat pump systems

### Backend API
- **Model**: `SystemPhotos` in `system_photos_model.php`
- **Key Methods**:
  - `upload_photo($userid)` - handles file upload with photo_type validation
  - `get_photos($userid, $system_id)` - returns photos with type information
  - `get_all_photos_admin($userid, $page, $limit)` - admin interface pagination
- **Validation**: MIME type checking with `finfo_file()`, 5MB limit, max 4 photos per system
- **Prepared Statements**: Critical - ensure parameter count matches placeholder count in bind_param

### Frontend Implementation
- **Main View**: `system_view.php` with Vue.js integration
- **Photo Type Boxes**: Dedicated UI containers for `outdoor_unit`, `plant_room`, `other`
- **Conditional Event Handlers**: Upload disabled when photos exist for specific types
- **CSS Grid Layout**: Responsive photo type containers in `system_view.css`
- **Admin Interface**: `system_photos_admin_view.php` with photo type badges and pagination

### File Organization
- **Uploads**: `www/theme/img/system/{system_id}/` directory structure
- **Thumbnails**: Auto-generated in multiple sizes (80x60, 150, 300, etc.)
- **CLI Management**: `generate_thumbnails.php` for batch thumbnail processing

### UX Patterns
- **Type-specific Upload**: Placeholder boxes show when no photo exists for outdoor_unit/plant_room
- **Visual Feedback**: Drag states, progress bars, colored badges for photo types
- **Admin Management**: Sortable table with photo type column, delete functionality
- **Access Control**: User permissions checked for upload/delete operations

## Key Conventions

### File Organization
- **Views**: Either in `Modules/{name}/views/` or `views/` in project root
- **Assets**: CSS/JS in module directories, images in `www/theme/img/`
- **Global utilities**: In `www/Lib/` directory

### Database Patterns
- **Integer IDs**: Auto-incrementing primary keys
- **JSON fields**: Used for thumbnail metadata, complex data structures
- **Prepared statements**: Always use for user input
- **Access control**: Check permissions in models via `has_read_access()`/`has_write_access()`

### API Endpoints
- **Format suffix**: `.json` for API responses (e.g., `/system/photos.json`)
- **Route actions**: Controller methods map to URL segments (`/system/upload-photo`)
- **Response format**: `array("success" => bool, "message" => string, ...)`

### Security Practices
- **Input validation**: Use `get()`, `post()`, `prop()` helpers from `core.php`
- **File uploads**: Validate MIME types with `finfo_file()`, not just extensions
- **Directory traversal**: Use `realpath()` to validate included files
- **Admin checks**: Always verify `$session['admin']` for admin-only features

## Development Tips

### Adding New Features
1. Create module directory: `www/Modules/newfeature/`
2. Add controller function: `function newfeature_controller() { ... }`
3. Define schema in `newfeature_schema.php`
4. Update `index.php` to initialize any global model objects
5. Add database access in model with proper permissions checking

### Photo System Integration
- **Upload**: Use `SystemPhotos->upload_photo()` for backend
- **Frontend**: Include photo mixins and utility files
- **Thumbnails**: Automatic generation, use `PhotoUtils.selectThumbnail()` for display
- **Admin**: Photos manageable via `/system/photos/admin` interface
- **Photo Types**: Three categories - `outdoor_unit`, `plant_room`, `other`
- **Type-specific UI**: Dedicated upload boxes for outdoor unit and plant room photos
- **Conditional Upload**: Upload handlers disabled when specific photo types already exist

### Data Loading
- **Development**: `load_dev_env_data.php` with environment variables to control what loads
- **Production**: Link to existing Emoncms installation via API keys
- **Performance**: Use Redis caching where available, degrade gracefully if not

## Debugging & Development Commands

### Database Operations
```bash
# Access MariaDB database directly
docker compose exec db mariadb -u heatpumpmonitor -p"heatpumpmonitor" heatpumpmonitor

# Check photo data and types
docker compose exec db mariadb -u heatpumpmonitor -p"heatpumpmonitor" heatpumpmonitor -e "SELECT id, system_id, photo_type, original_filename FROM system_images ORDER BY date_uploaded DESC LIMIT 10;"

# Update existing data for new columns
docker compose exec db mariadb -u heatpumpmonitor -p"heatpumpmonitor" heatpumpmonitor -e "UPDATE system_images SET photo_type='other' WHERE photo_type IS NULL OR photo_type='';"
```

### Common Development Tasks
```bash
# Start development environment
docker compose up -d

# Check container status
docker compose ps

# View logs for debugging
docker compose logs web
docker compose logs db

# Load sample data and update schemas
docker compose run load_dev_env_data

# Clean up orphaned containers
docker compose up --remove-orphans
```

### Debugging Tips
- **Parameter Binding**: Always match placeholder count with bind_param type string length
- **Database Schema**: Use MariaDB CLI to verify schema changes and data migration
- **Photo Types**: Check `system_images.photo_type` values match expected: `outdoor_unit`, `plant_room`, `other`
- **Bootstrap Classes**: Use `bg-*` for badges in Bootstrap 5, not `badge-*` from Bootstrap 4
- **Vue.js Debugging**: Check browser console for Vue component errors and API responses

This project emphasizes simplicity and direct patterns over complex frameworks. When adding features, follow the existing modular structure and lightweight approach rather than introducing heavy dependencies.