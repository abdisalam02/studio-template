/**
 * ==============================================================================
 * STUDIO CONFIG — MULTI-TENANT RUNTIME RESOLUTION
 * Reads the active tenant from the URL (?tenant=studio-klo) and exposes the
 * matching API base, branding profile and contact details to the admin portal.
 * Defaults to Gangina when no tenant is supplied.
 * ==============================================================================
 */

(function () {
  'use strict';

  var DEFAULT_TENANT = 'gangina';
  var TENANT_ALIASES = {
    'studio-klo': 'studio-klo',
    'studioklo': 'studio-klo',
    'klo': 'studio-klo',
    'gangina': 'gangina',
    'gangina-beauty-studio': 'gangina'
  };

  // Tenant branding profiles (static portal metadata).
  // `adminEmails` powers smart login auto-detection on the security gate.
  var TENANT_PROFILES = {
    'gangina': {
      name: 'Gangina',
      fullName: 'Gangina Beauty Studio',
      subtitle: 'tooth gems & custom grillz',
      loginSubtitle: 'Tooth Gems & Grillz · Oslo',
      niche: 'Tooth Gems & Grillz',
      logoUrl: 'img/logo-v2.png',
      studioEmail: 'niwache15@gmail.com',
      adminEmails: ['niwache15@gmail.com'],
      whatsapp: '4740000000',
      address: 'Dronningens gate 15, 0152 Oslo',
      org: '999 888 777 MVA',
      websiteUrl: 'https://noire-rosy.vercel.app',
      bookingUrl: 'https://noire-rosy.vercel.app/book.html'
    },
    'studio-klo': {
      name: 'Studio Klō',
      fullName: 'Studio Klō',
      subtitle: 'Exclusive nail design & beauty care',
      loginSubtitle: 'Exclusive nail design & beauty care',
      niche: 'Japanese Structure Gel & Nail Art',
      logoUrl: 'img/klø.png',
      studioEmail: 'abdisalamadam8@gmail.com',
      adminEmails: ['abdisalamadam8@gmail.com'],
      whatsapp: '4741122333',
      address: 'Frognerveien, Oslo Sentrum',
      org: '998 776 554 MVA',
      websiteUrl: 'https://noire-rosy.vercel.app',
      bookingUrl: 'https://noire-rosy.vercel.app/book.html'
    }
  };

  function readTenantParam() {
    try {
      var params = new URLSearchParams(window.location.search || '');
      return (params.get('tenant') || '').trim();
    } catch (e) {
      return '';
    }
  }

  var tenantParam = readTenantParam();
  var hasTenantParam = Boolean(tenantParam);

  function resolveTenantFromUrl() {
    var requested = tenantParam.toLowerCase();
    if (!requested) return DEFAULT_TENANT;
    return TENANT_ALIASES[requested] || requested;
  }

  var activeTenant = resolveTenantFromUrl();
  var profile = TENANT_PROFILES[activeTenant] || null;
  var origin = window.location.origin;
  var encodedTenant = encodeURIComponent(activeTenant);

  window.GANGINA_CONFIG = {
    tenantId: activeTenant,
    activeTenant: activeTenant,
    knownTenant: Boolean(profile),
    // Explicit ?tenant= presence powers the neutral-vs-branded login gate.
    tenantParam: tenantParam,
    hasTenantParam: hasTenantParam,
    apiBase: origin + '/api/v1/t/' + encodedTenant,
    webhookUrl: origin + '/api/v1/t/' + encodedTenant + '/bookings',
    availabilityUrl: origin + '/api/v1/t/' + encodedTenant + '/availability',
    // Admin endpoints are global; the tenant is passed as a query param / body.
    adminApiBase: origin,
    studioEmail: profile ? profile.studioEmail : '',
    studioName: profile ? profile.name : activeTenant,
    studioFullName: profile ? profile.fullName : activeTenant,
    studioSubtitle: profile ? profile.subtitle : '',
    studioLoginSubtitle: profile ? profile.loginSubtitle : '',
    studioLogo: profile ? profile.logoUrl : '',
    websiteUrl: profile ? profile.websiteUrl : '',
    bookingUrl: profile ? profile.bookingUrl : '',
    profiles: TENANT_PROFILES
  };

  // Convenience global for scripts that only need the slug.
  window.ACTIVE_TENANT_ID = activeTenant;
})();
