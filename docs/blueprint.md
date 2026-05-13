# **App Name**: غاز دليفري (Gas Delivery)

## Core Features:

- Role-Based Authentication: Users can sign up/log in and select their role (Customer or Driver) on a dedicated landing page, powered by Firebase Authentication.
- Customer Map View: Customers can view their current location on an interactive map and see the real-time locations of available gas cylinder delivery trucks nearby. Data for truck locations is synced via Firestore.
- Driver Live Location Broadcasting: Drivers can 'go online' from their dashboard to broadcast their current GPS location in real-time, allowing customers to track their position. Location data is stored and updated in Firestore.
- Smart Bell Dispatch Tool: Customers press a '🔔 رن الجرس' button. A server-side tool (e.g., Firebase Functions) automatically identifies the nearest available driver based on their real-time location and dispatches an immediate notification to that driver with the customer's coordinates and address details.
- Driver Request Management: Drivers receive notifications for new delivery requests, allowing them to view customer details, accept, or decline the delivery. Request status and assignment are managed in Firestore.
- Proximity Auto-Notification: Customers are automatically notified (via web push notification) when their assigned driver is within a 500-meter radius of their delivery location. This relies on real-time location data from Firestore and server-side processing.
- Direct Communication: Implement buttons for customers and drivers to initiate direct phone calls and send quick chat messages to facilitate communication during delivery. Chat messages use Firestore for real-time syncing.

## Style Guidelines:

- Primary Color: Energetic, warm orange (#FA6619) for main actions and branding elements. Inspired by the vibrancy of local markets and gas flame. (HSL: 30, 90%, 50%)
- Background Color: A clean, desaturated warm off-white (#FBF3EE) to maintain professionalism and complement the orange. (HSL: 30, 20%, 95%)
- Accent Color: A strong, slightly darker red (#B31E1E) for important alerts, notifications, and secondary actions that need emphasis. (HSL: 0, 70%, 40%)
- Body and headline font: 'Inter' (sans-serif) for its clear, modern, and neutral appearance, ensuring readability in both English and Arabic texts. Arabic UI will be a primary consideration for localization.
- Utilize simple, easily recognizable icons that are culturally appropriate for Jordan, complementing the clean UI design. Icons should be clear indicators for actions like 'Ring Bell,' 'Call,' and 'Chat'.
- Clean, intuitive layout with ample white space to improve readability and user experience. Information hierarchy will be clearly defined, prioritizing essential features and status updates.
- Subtle and functional animations for user feedback, such as map loading states, notification pop-ups, and transition effects between customer and driver interfaces, enhancing user engagement without distraction.