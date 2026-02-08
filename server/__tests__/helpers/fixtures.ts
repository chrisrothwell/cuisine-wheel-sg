import type {
  User,
  Country,
  Restaurant,
  Visit,
  Review,
  Group,
  GroupMember,
} from "../../../drizzle/schema";

export const mockUser: User = {
  id: 1,
  openId: "google_12345",
  name: "Test User",
  email: "test@example.com",
  loginMethod: "google",
  role: "user",
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
  lastSignedIn: new Date("2025-01-01"),
};

export const mockCountry: Country = {
  id: 10,
  name: "Singapore",
  code: "SG",
  alpha2: "SG",
  alpha3: "SGP",
  description: null,
  region: "Asia",
  subRegion: "South-eastern Asia",
  unMember: true,
  unMembershipStatus: null,
  createdAt: new Date("2025-01-01"),
};

export const mockRestaurant: Restaurant = {
  id: 1,
  countryId: 10,
  name: "Test Restaurant",
  address: "123 Test St, Singapore",
  latitude: 1.3521,
  longitude: 103.8198,
  placeId: "ChIJtest123",
  phoneNumber: "+6512345678",
  website: "https://test-restaurant.sg",
  priceLevel: 2,
  imageUrl: null,
  description: "A test restaurant",
  isActive: true,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

export const mockVisit: Visit = {
  id: 1,
  restaurantId: 1,
  groupId: null,
  visitedAt: new Date("2025-06-01"),
  notes: "Great food!",
  createdAt: new Date("2025-06-01"),
};

export const mockReview: Review = {
  id: 1,
  userId: 1,
  restaurantId: 1,
  rating: 4,
  comment: "Really enjoyed it",
  isPublic: true,
  createdAt: new Date("2025-06-01"),
  updatedAt: new Date("2025-06-01"),
};

export const mockGroup: Group = {
  id: 1,
  name: "Foodies SG",
  description: "Singapore food lovers",
  creatorId: 1,
  isPublic: true,
  imageUrl: null,
  createdAt: new Date("2025-01-01"),
};

export const mockGroupMember: GroupMember = {
  id: 1,
  groupId: 1,
  userId: 1,
  role: "owner",
  joinedAt: new Date("2025-01-01"),
};
