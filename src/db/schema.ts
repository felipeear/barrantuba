import { pgTable, text, doublePrecision, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';

// Users table (Fishermen & Administrators)
export const usersTable = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role').notNull().default('member'),
  avatar: text('avatar'),
  phone: text('phone'),
  city: text('city'),
  passwordHash: text('password_hash'),
  equipment: jsonb('equipment'),
  preferredSpecies: jsonb('preferred_species'),
  joinedDate: text('joined_date'),
  bio: text('bio'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Fishing spots table
export const spotsTable = pgTable('fishing_spots', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  waterType: text('water_type').notNull(),
  accessType: text('access_type').notNull(),
  structureNotes: text('structure_notes'),
  recommendedBaits: jsonb('recommended_baits'),
  targetSpecies: jsonb('target_species'),
  depthMeters: doublePrecision('depth_meters'),
  rating: doublePrecision('rating').default(5.0),
  imageUrl: text('image_url'),
  createdByUserId: text('created_by_user_id'),
  createdByUserName: text('created_by_user_name'),
  createdAt: text('created_at'),
});

// Fish catches log
export const catchesTable = pgTable('fish_catches', {
  id: text('id').primaryKey(),
  species: text('species').notNull(),
  weightKg: doublePrecision('weight_kg').notNull(),
  lengthCm: doublePrecision('length_cm').notNull(),
  baitUsed: text('bait_used').notNull(),
  spotId: text('spot_id').notNull(),
  spotName: text('spot_name').notNull(),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  userAvatar: text('user_avatar'),
  photoUrl: text('photo_url').notNull(),
  capturedAt: text('captured_at').notNull(),
  notes: text('notes'),
  waterCondition: text('water_condition'),
  moonPhase: text('moon_phase'),
  weatherTemp: text('weather_temp'),
  likesCount: integer('likes_count').default(0),
});

// Active real-time fishing sessions
export const activeSessionsTable = pgTable('active_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  userAvatar: text('user_avatar'),
  spotId: text('spot_id').notNull(),
  spotName: text('spot_name').notNull(),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  startedAt: text('started_at').notNull(),
  notes: text('notes'),
  targetSpecies: jsonb('target_species'),
  contactPhone: text('contact_phone'),
});

// Club chat messages
export const chatMessagesTable = pgTable('chat_messages', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  userAvatar: text('user_avatar'),
  text: text('text').notNull(),
  timestamp: text('timestamp').notNull(),
  spotMention: text('spot_mention'),
  spotId: text('spot_id'),
});

// Tournaments table
export const tournamentsTable = pgTable('tournaments', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  location: text('location').notNull(),
  modality: text('modality'),
  scoringSystem: text('scoring_system'),
  organizerContact: text('organizer_contact'),
  targetSpecies: jsonb('target_species'),
  prizes: jsonb('prizes'),
  rules: jsonb('rules'),
  registeredUserIds: jsonb('registered_user_ids'),
  bannerUrl: text('banner_url'),
  entryFee: text('entry_fee'),
  maxParticipants: integer('max_participants').default(30),
  createdByUserId: text('created_by_user_id'),
  createdAt: text('created_at'),
  status: text('status').notNull(),
});

// Notifications
export const notificationsTable = pgTable('app_notifications', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull(),
  timestamp: text('timestamp').notNull(),
  read: text('read').default('false'),
  linkTab: text('link_tab'),
});

// Settings (Club logo, custom configs)
export const clubSettingsTable = pgTable('club_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

// Feed publications (individual atomic rows in PostgreSQL)
export const feedPostsTable = pgTable('feed_posts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  userAvatar: text('user_avatar'),
  userHandle: text('user_handle'),
  createdAt: text('created_at').notNull(),
  category: text('category').notNull(),
  text: text('text').notNull().default(''),
  mediaUrls: jsonb('media_urls'),
  mediaType: text('media_type'),
  hashtags: jsonb('hashtags'),
  likes: jsonb('likes'),
  likesCount: integer('likes_count').default(0),
  comments: jsonb('comments'),
  commentsCount: integer('comments_count').default(0),
  sharesCount: integer('shares_count').default(0),
  savedBy: jsonb('saved_by'),
});

// 24h Stories (individual atomic rows in PostgreSQL)
export const storiesTable = pgTable('feed_stories', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  userAvatar: text('user_avatar'),
  userHandle: text('user_handle'),
  category: text('category'),
  mediaUrl: text('media_url').notNull(),
  mediaType: text('media_type').notNull(),
  caption: text('caption'),
  createdAt: text('created_at').notNull(),
  viewedBy: jsonb('viewed_by'),
});

// Fish species photos for BiteTime™ (real photos persisted in PostgreSQL)
export const speciesPhotosTable = pgTable('species_photos', {
  speciesId: text('species_id').primaryKey(),
  speciesName: text('species_name').notNull(),
  imageData: text('image_data').notNull(),
  defaultImageData: text('default_image_data').notNull(),
  isCustom: text('is_custom').default('false'),
  updatedAt: text('updated_at').notNull(),
});

// Cache of online-identified real fish species per city (persisted in PostgreSQL)
export const citySpeciesCacheTable = pgTable('city_species_cache', {
  cityKey: text('city_key').primaryKey(),
  cityName: text('city_name').notNull(),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  waterEnvironment: text('water_environment').notNull(),
  speciesData: jsonb('species_data').notNull(),
  sourceLabel: text('source_label').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Bait / lure reference photos persisted as binary/base64 in PostgreSQL
export const baitPhotosTable = pgTable('bait_photos', {
  baitId: text('bait_id').primaryKey(),
  baitName: text('bait_name').notNull(),
  category: text('category').notNull(),
  imageData: text('image_data').notNull(),
  sourceLabel: text('source_label').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Per-species online-researched fishing bait guides persisted in PostgreSQL
export const speciesBaitGuidesTable = pgTable('species_bait_guides', {
  speciesId: text('species_id').primaryKey(),
  speciesName: text('species_name').notNull(),
  scientificName: text('scientific_name').notNull(),
  baitsData: jsonb('baits_data').notNull(),
  researchSummary: text('research_summary').notNull(),
  sourceLabel: text('source_label').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// 5 Normalized Tackle Recommendation Catalog Tables + User Saved Kits in PostgreSQL
export const tackleSpeciesTable = pgTable('tackle_species', {
  id: text('id').primaryKey(),
  data: jsonb('data').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const tackleRodsTable = pgTable('tackle_rods', {
  id: text('id').primaryKey(),
  data: jsonb('data').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const tackleReelsTable = pgTable('tackle_reels', {
  id: text('id').primaryKey(),
  data: jsonb('data').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const tackleLinesTable = pgTable('tackle_lines', {
  id: text('id').primaryKey(),
  data: jsonb('data').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const tackleBaitsTable = pgTable('tackle_baits', {
  id: text('id').primaryKey(),
  data: jsonb('data').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const tackleSavedKitsTable = pgTable('tackle_saved_kits', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  speciesId: text('species_id').notNull(),
  speciesName: text('species_name').notNull(),
  fishingMode: text('fishing_mode').notNull(),
  baitPreference: text('bait_preference').notNull(),
  kitData: jsonb('kit_data').notNull(),
  createdAt: text('created_at').notNull(),
});
