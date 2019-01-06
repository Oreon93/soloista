# What is Soloista?

Soloista is a **fictitious start-up** which lists music practice rooms all over the city of Barcelona. The Soloista website allows users to search rooms by price, location and availability, then make a booking. It also has functionality for an administrator to add, edit, and delete rooms.

# Version log

## 0.1

Current features:
- Home page (not fully functional)
- User registration and login
- Search bar and room listings page. Currently only searchable by date available.
- Individual room pages
- Only registered users can book; unregistered users will be asked to log in
- Logged in users have access to rudimentary CRUD capabilities; this is not yet restricted to administrators


## 0.2 - 20/11/2018

Booking management
- Added booking cancellation functionality
- Added ability to report a problem with the room
- Restricted bookings view to upcoming bookings only

Account area
- Added full name and mobile number to users
- Users required to provide a mobile number when registeringg
- Users can update their information from the account area

Password reset
- Added user password reset/forgot password functionality
- User sent an e-mail to follow to a password reset link
- User e-mailed a confirmation that their password has been changed

Design
- Total redesign of the site to a blue/yellow colour scheme
- New home page redesign

Flash messages
- Flash messages implemented across the site with improved error reporting

## 0.3 - 01/12/2018

- Simple code refactor to split out account, reviews, auth and rooms views

Reviews
- Users can now only leave a review from the bookings page
- Reviews restricted to rooms a user has visited
- Bookings page displays "Already reviewed" if user has already reviewwed the room

User roles
- Added an "admin" user role
- Regular users cannot add, edit or delete rooms

## 0.4 - 23/12/2018

Booking system
- Added filters and Ajax to refresh rooms without reloading page
- Added a "map view" with rooms plotted on a map, using Mapbox. Rooms now have GeoJSON coordinates in the room model.
- User can now book a room book a room from the individual room page, as well as change the search date and refresh the available time slots


## 0.5 - 06/01/2018

Booking system
- Fixed an issue where users who were not logged in could not book a room from the individual room page

Payment
- Added Stripe payments and a "Pay" page where the user's booking is confirmed
- All booking routes now lead to the "Pay" page

Room editing
- Administrator can now upload images to the server for the room
- Administrator can now edit the coordinates of the room

Static pages
- Added FAQs page
- Added Soloista+ page
- Added Contact form functionality on landing page using NodeMailer

HTML
- Breadcrumbs added to all relevant pages
- Flash messages "spun out" into partial and added to relevant pages
- Added footer

CSS
- General CSS improvements
- Some reorganisation of the main.css file
- All pages now responsive