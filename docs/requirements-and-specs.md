# Software Requirements Specification
## Makeup Artist Booking Platform

**Version:** 1.0  
**Date:** March 2026  
**Status:** Draft

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [Revenue Model Summary](#5-revenue-model-summary)
6. [Open Questions and Future Iterations](#6-open-questions-and-future-iterations)
7. [Appendix: User Flow Summaries](#7-appendix-user-flow-summaries)

---

## 1. Introduction

### 1.1 Purpose

This document defines the complete software requirements for the Makeup Artist Booking Platform, a location-based web application that connects customers with nearby makeup artists. It serves as the authoritative reference for design, development, testing, and stakeholder alignment.

### 1.2 Product Scope

The platform enables customers to discover and book makeup artists based on proximity (GPS location + kilometer radius), view artist portfolios, and pay directly. Artists create profiles, list services with their own pricing, manage bookings, and operate on a points-based visibility system. The platform monetizes through a 10% commission on each completed service and through point package sales.

### 1.3 Definitions and Acronyms

| Term | Definition |
|------|-----------|
| **Artist** | A registered makeup professional offering services on the platform |
| **Client / Customer** | A person searching for and booking makeup services |
| **Points** | Virtual currency used to control artist visibility; 500 awarded on registration |
| **Commission** | 10% of the service price paid by the artist to the platform after each completed booking. Calculated on the artist's listed price |
| **Proximity Search** | Location-based search using the client's shared GPS coordinates + configurable kilometer radius |
| **Portfolio** | Gallery of an artist's previous work (photos) visible to clients |

### 1.4 Document Conventions

Requirements are labeled with a prefix: **FR** for functional requirements, **NFR** for non-functional requirements. Priority levels are **P0** (must-have for launch), **P1** (should-have), and **P2** (nice-to-have / future iteration).

---

## 2. System Overview

### 2.1 System Architecture

The system is a web application with three distinct interfaces: a Client-facing frontend, an Artist dashboard, and an Admin panel. All communicate with a shared backend API and database. The architecture follows a standard client-server model with a responsive web frontend.

### 2.2 User Roles

| Role | Description | Key Capabilities |
|------|-------------|-----------------|
| **Client** | End-user seeking makeup services | Share GPS location, search by km radius, view portfolios, book services, pay, rate artists |
| **Artist** | Makeup professional | Create profile, list services, accept/decline bookings, manage points, send commissions |
| **Admin** | Platform operator | Manage service catalog, manage users, monitor commissions, sell point packages, resolve disputes |

---

## 3. Functional Requirements

### 3.1 Registration and Authentication

#### 3.1.1 Artist Registration

| Req ID | Requirement | Priority |
|--------|------------|----------|
| FR-101 | Artist registers with: full name, email, phone, password, GPS location (mandatory), and profile photo. | P0 |
| FR-102 | Location (GPS coordinates) is mandatory at registration. The artist shares their location via browser geolocation or by pinning on a map. Registration cannot proceed without it. | P0 |
| FR-103 | Upon successful registration, the system credits the artist's account with 500 points automatically. | P0 |
| FR-104 | Artist must select 3 to 5 service categories from a platform-defined list during registration. | P0 |
| FR-105 | Artist profile must include a portfolio section where they upload photos of previous work (minimum 3 photos). | P0 |
| FR-106 | Artist accounts require admin approval before going live. Status: Pending, Approved, Suspended. | P1 |

#### 3.1.2 Client Registration

| Req ID | Requirement | Priority |
|--------|------------|----------|
| FR-111 | Client registers with: full name, email or phone, and password. | P0 |
| FR-112 | Client must share their GPS location (via browser geolocation or map pin) to perform a search. Location sharing is mandatory for search, not for registration. | P0 |
| FR-113 | Guest browsing is allowed (view portfolios, search), but booking requires registration. | P1 |

#### 3.1.3 Authentication

| Req ID | Requirement | Priority |
|--------|------------|----------|
| FR-121 | Email/phone + password login for both roles. | P0 |
| FR-122 | Password reset via email or SMS OTP. | P0 |
| FR-123 | Session management with automatic timeout after 30 minutes of inactivity. | P0 |

---

### 3.2 Artist Profile and Service Management

| Req ID | Requirement | Priority |
|--------|------------|----------|
| FR-201 | Artist can create and edit a profile: bio, portfolio photos (up to 20), availability schedule. | P0 |
| FR-202 | Artist selects 3 to 5 service types from a platform-defined catalog (e.g., Bridal, Party, Photoshoot, Editorial, Special Effects). | P0 |
| FR-203 | Each artist sets their own price for each service they offer. Prices are displayed on their profile and in search results. Artists can update their prices at any time. | P0 |
| FR-204 | Artist can set their availability calendar (available days/hours) to prevent bookings during off-hours. | P1 |
| FR-205 | Artist can temporarily deactivate their profile (pauses visibility without losing points). | P1 |

---

### 3.3 Client Search and Discovery

#### 3.3.1 Location-Based Search

| Req ID | Requirement | Priority |
|--------|------------|----------|
| FR-301 | Search is location-first: client must share their GPS location (via browser geolocation or by pinning on a map) before any results are shown. | P0 |
| FR-302 | Client sets a kilometer radius (e.g., 5 km, 10 km, 20 km, 50 km) around their shared location to define the search area. Distance is calculated from the client's GPS coordinates to each artist's GPS coordinates. | P0 |
| FR-303 | Search results display only artists with points > 0 (active visibility). | P0 |
| FR-304 | Default sort order: nearest first, then by rating. | P0 |

#### 3.3.2 Filtering and Results

| Req ID | Requirement | Priority |
|--------|------------|----------|
| FR-311 | Filters available: service type, price range, minimum rating, availability date. | P0 |
| FR-312 | Search results show: artist name, distance, average rating, portfolio thumbnails (work samples), and service tags. Contact details are hidden. | P0 |
| FR-313 | Clients can view the artist's full portfolio (work gallery) from search results. | P0 |
| FR-314 | Artist profile pages are visible to clients (name, bio, portfolio, services, ratings). Contact information (phone, email) is hidden behind a "Contact" button that triggers a point deduction from the artist. | P0 |

---

### 3.4 Points System (Artist Visibility Currency)

The points system is the platform's mechanism for monetizing artist access to client leads. It replaces traditional subscription fees with a pay-per-engagement model.

#### 3.4.1 Points Rules

| Req ID | Requirement | Priority |
|--------|------------|----------|
| FR-401 | Every new artist receives 500 points upon registration (one-time welcome credit). | P0 |
| FR-402 | When an artist accepts a booking, 20 points are deducted from their balance. | P0 |
| FR-403 | When a client taps the "Contact" or "Call" button on an artist's profile, 10 points are deducted from the artist's balance. The artist is notified of this deduction. | P0 |
| FR-404 | Points are never deducted when a client merely views an artist's portfolio or work gallery. | P0 |
| FR-405 | When an artist's points balance reaches 0, their profile is completely hidden from all search results and client views until they purchase more points. | P0 |
| FR-406 | Artists can purchase point packages from the platform. Pricing for packages is defined by admin. | P0 |
| FR-407 | Artist dashboard shows: current point balance, points deduction history (with reason: "Booking accepted" or "Contact reveal"), and a "Buy Points" button. | P0 |
| FR-408 | The system must prevent negative point balances. If an artist has fewer than 20 points, they cannot accept bookings. If fewer than 10 points, the contact button is disabled. | P0 |

#### 3.4.2 Point Packages (Admin-Defined)

| Req ID | Requirement | Priority |
|--------|------------|----------|
| FR-411 | Admin can create, edit, and deactivate point packages (e.g., 500 points, 1000 points, 2000 points) with pricing. | P0 |
| FR-412 | Artists purchase points via online payment (mobile money, card, or platform-supported methods). | P0 |
| FR-413 | Points are credited immediately upon successful payment confirmation. | P0 |

---

### 3.5 Booking Workflow

| Req ID | Requirement | Priority |
|--------|------------|----------|
| FR-501 | Client selects an artist, chooses a service type, picks a date and time, and submits a booking request. | P0 |
| FR-502 | Artist receives a notification and can accept or decline the booking within a configurable time window (default: 24 hours). If no response, booking auto-expires. | P0 |
| FR-503 | Upon acceptance, 20 points are deducted from the artist. Both parties receive confirmation with booking details. | P0 |
| FR-504 | Booking statuses: Pending, Accepted, Declined, Completed, Cancelled, Expired. | P0 |
| FR-505 | Client can cancel a booking up to 24 hours before the scheduled time without penalty. | P1 |
| FR-506 | After service completion, the artist marks the booking as "Completed", triggering the review prompt for the client. | P0 |

---

### 3.6 Ratings and Reviews

| Req ID | Requirement | Priority |
|--------|------------|----------|
| FR-701 | After a booking is marked "Completed", the client is prompted to leave a rating (1–5 stars) and an optional text review. | P0 |
| FR-702 | Ratings are displayed as an average on the artist's profile and in search results. | P0 |
| FR-703 | Reviews are public and visible to all clients. | P0 |
| FR-704 | Artists can respond to reviews (one response per review). | P1 |
| FR-705 | Admin can moderate and remove inappropriate reviews. | P1 |

---

### 3.7 Notifications

| Req ID | Requirement | Priority |
|--------|------------|----------|
| FR-801 | Artists receive notifications for: new booking requests, booking cancellations, point deductions (with reason), low point balance warnings (at 50 and 20 points), and new reviews. | P0 |
| FR-802 | Clients receive notifications for: booking acceptance/decline, booking reminders (24 hours before), and review prompts. | P0 |
| FR-803 | Notification channels: in-app, email, and SMS (configurable per user). | P1 |

---

### 3.8 Admin Panel

| Req ID | Requirement | Priority |
|--------|------------|----------|
| FR-901 | Admin can define and update the service catalog (service types/categories that artists can choose from). Pricing is set by individual artists, not the admin. | P0 |
| FR-902 | Admin can create and manage point packages and their pricing. | P0 |
| FR-903 | Admin can view and manage all users (artists and clients), including suspend/ban actions. | P0 |
| FR-904 | Admin dashboard shows key metrics: total bookings, total revenue (point sales), active artists, and commission tracking. | P0 |
| FR-905 | Admin can review and approve artist registrations. | P1 |
| FR-906 | Admin can manage and moderate reviews. | P1 |

---

## 4. Non-Functional Requirements

| Req ID | Category | Requirement | Priority |
|--------|----------|------------|----------|
| NFR-01 | Platform | Web application only. Must be responsive and functional on desktop, tablet, and mobile browsers. | P0 |
| NFR-02 | Performance | Search results must load within 3 seconds. Pages must render within 2 seconds. | P0 |
| NFR-03 | Security | All passwords hashed. HTTPS enforced. Session tokens with expiration. Input validation on all forms. | P0 |
| NFR-04 | Data Privacy | Artist contact details (phone, email) are not exposed in the frontend source or API responses until a "Contact" action triggers a point deduction. | P0 |
| NFR-05 | Availability | 99.5% uptime target. Scheduled maintenance windows communicated 48 hours in advance. | P1 |
| NFR-06 | Scalability | System should support up to 10,000 artists and 50,000 clients in the first year without architecture changes. | P1 |
| NFR-07 | Browser Support | Latest 2 versions of Chrome, Firefox, Safari, and Edge. Mobile Safari and Chrome on iOS/Android. | P0 |
| NFR-08 | Localization | Support for at least one local language in addition to English. | P2 |

---

## 5. Revenue Model Summary

The platform has two revenue streams:

**Stream 1: Commission Revenue**  
A 10% commission is charged on every completed booking. The artist is responsible for remitting the commission to the platform.

**Stream 2: Point Package Sales**  
Artists purchase point packages to maintain profile visibility. Since points are deducted for both accepted bookings (20 points) and client contact reveals (10 points), active artists will need to replenish points regularly. This creates a recurring, engagement-driven revenue stream.

---

## 6. Open Questions and Future Iterations

| # | Question / Consideration | Notes |
|---|--------------------------|-------|
| 1 | Point deduction values (20 per booking, 10 per contact) are initial test values. Should be monitored and adjusted based on artist feedback and platform economics. | Iterate after launch |
| 2 | Should there be a refund policy if an artist accepts a booking but the client no-shows? | Affects point deduction fairness |
| 3 | Should clients see artist profiles at all, or only portfolios? Current decision: profiles visible, contact gated by points. May revisit. | Core business model dependency |
| 4 | Point package pricing strategy: flat rate vs. volume discounts? | Admin-configurable, needs market testing |
| 5 | Should there be a dispute resolution flow for contested bookings or reviews? | P2 feature |
| 6 | Will the platform support artist verification badges (e.g., ID-verified, certified professional)? | Trust and safety enhancement |

---

## 7. Appendix: User Flow Summaries

### 7.1 Client Booking Flow

1. Client shares their GPS location and sets a kilometer radius.
2. System returns nearby artists (points > 0), sorted by distance then rating.
3. Client browses portfolios and applies filters (service type, rating, price).
4. Client selects an artist, views their profile page.
5. Client taps "Contact" button (10 points deducted from artist) or proceeds to "Book" directly.
6. Client selects service, date, time, and submits booking request.
7. Artist accepts or declines (20 points deducted on accept).
8. Service is delivered. Client pays artist directly.
9. Artist marks booking as completed.
10. Client is prompted to rate and review.
11. Artist remits 10% commission to platform.

### 7.2 Artist Lifecycle Flow

1. Artist registers with mandatory GPS location, uploads portfolio, selects 3–5 services.
2. System credits 500 welcome points. Profile goes live (or pending admin approval).
3. Artist appears in client searches when within the client's selected kilometer radius.
4. Points decrease as bookings are accepted and clients use Contact button.
5. At low points (50, 20), artist receives warning notifications.
6. At 0 points, profile is hidden from all searches.
7. Artist purchases a point package to restore visibility.
8. Cycle continues.

---

*End of Document*
