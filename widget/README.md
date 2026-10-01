# Standalone Embeddable Booking Widget

A lightweight, standalone React booking modal designed to be dropped into existing client websites (Squarespace, Wix, Shopify, Webflow, WordPress).

---

## 1. Quick Embed (HTML Snippet)

Place this container where you want the booking button or trigger to appear:

```html
<!-- Booking Widget Container -->
<div 
  id="studio-booking-widget" 
  data-studio-booking 
  data-studio-name="Atelier Studio" 
  data-primary-color="#171717"
></div>

<!-- Script Bundle -->
<script src="https://cdn.youragency.space/widgets/booking.min.js" async></script>
```

---

## 2. Programmatic Usage (ESM)

```tsx
import { BookingModal } from "@agency/studio-booking-widget";

export default function ExternalSitePage() {
  return (
    <section>
      <h1>Velkommen til Studio</h1>
      <BookingModal studioName="Atelier Studio" primaryColor="#171717" />
    </section>
  );
}
```

---

## 3. Building the Bundle
```bash
npm run build
```
Outputs to `dist/widget.js` (IIFE bundle ready for CDN distribution).
