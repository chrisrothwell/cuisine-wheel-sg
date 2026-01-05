# Project TODO

## Core Features
- [x] Database schema design (countries, restaurants, visits, ratings, groups)
- [x] Cyberpunk theme implementation (black bg, neon pink/cyan, geometric fonts, glow effects)
- [x] Global layout structure with navigation
- [x] Interactive spinning wheel for cuisine/country selection
- [x] Restaurant database with country/cuisine categorization
- [x] Google Maps integration for restaurant data
- [x] User authentication system (already provided by template)
- [x] Visit tracking system with timestamps
- [x] Rating and review system
- [x] Group creation and management
- [x] Group progress tracking (collective visits)
- [x] Cross-group visibility for restaurants and reviews
- [x] Restaurant discovery interface with filtering
- [x] User dashboard (visit history, ratings, group memberships)
- [x] Google Maps display (locations, directions, nearby search)
- [x] Location-based search and filtering
- [x] Owner notifications for key events (registrations, groups, trending restaurants)

## Technical Tasks
- [x] Set up database tables and relationships
- [x] Create tRPC procedures for all features
- [x] Build reusable UI components
- [x] Implement optimistic updates for better UX
- [x] Write vitest tests for critical features
- [x] Test all features end-to-end

## New Features (In Progress)
- [x] Google Maps search fallback when no restaurants in database
- [x] Add restaurant from Google Maps link (parse and import)
- [x] Extract restaurant details from Google Maps (name, address, coordinates)
- [x] Validation and error handling for Google Maps imports

## Google Maps Search Link (In Progress)
- [x] Add "Search with Google Maps" link to wheel results
- [x] Generate prefilled search query (e.g., "Indonesian restaurants in Singapore")
- [x] Open Google Maps in new tab with search term
