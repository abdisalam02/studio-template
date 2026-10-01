import assert from 'node:assert';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TENANT_ID = 'gangina';

console.log(`\n======================================================`);
console.log(`🚀 STARTING END-TO-END VERIFICATION SUITE: ${BASE_URL}`);
console.log(`   Target Tenant: ${TENANT_ID}`);
console.log(`======================================================\n`);

async function runTests() {
  const results = {
    module_1_availability: 'fail',
    module_2_booking_create: 'fail',
    module_3_admin_feed: 'fail',
    module_4_status_confirm: 'fail',
    module_5_status_cancel: 'fail',
  };

  let createdBookingId = null;
  let createdBookingRef = null;
  let testDateStr = '';

  try {
    // -------------------------------------------------------------------------
    // MODULE 1: Availability Slot Generation
    // -------------------------------------------------------------------------
    console.log('▶ [MODULE 1] Testing Availability Endpoint...');
    // Target 7 days into the future to avoid any conflicts
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);
    testDateStr = targetDate.toISOString().split('T')[0];

    const availUrl = `${BASE_URL}/api/v1/t/${TENANT_ID}/availability?date=${testDateStr}&service_id=1`;
    const availRes = await fetch(availUrl);
    assert.strictEqual(availRes.status, 200, `Expected 200 from availability, got ${availRes.status}`);
    
    const availData = await availRes.json();
    assert.ok(Array.isArray(availData.slots), 'Availability response must contain a "slots" array');
    console.log(`  ✔ Received ${availData.slots.length} available slots for ${testDateStr}`);
    results.module_1_availability = 'pass';

    // -------------------------------------------------------------------------
    // MODULE 2: Booking Creation (Client Submission)
    // -------------------------------------------------------------------------
    console.log('\n▶ [MODULE 2] Testing Booking Creation Flow...');
    const startTimeIso = (availData.iso_slots && availData.iso_slots.length > 0)
      ? availData.iso_slots[0]
      : `${testDateStr}T11:30:00.000Z`;

    const createPayload = {
      service_id: 1,
      service_name: 'Tannsmykke 1 Krystall',
      start_time: startTimeIso,
      customer: {
        name: 'Automated Test Client',
        email: 'test-runner@gangina-studio.no',
        phone: '+4799887766',
        notes: 'Automated verification test run'
      }
    };

    const createRes = await fetch(`${BASE_URL}/api/v1/t/${TENANT_ID}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createPayload)
    });

    const createData = await createRes.json();
    assert.ok([200, 201].includes(createRes.status), `Booking creation failed with status ${createRes.status}: ${JSON.stringify(createData)}`);
    assert.ok(createData.booking || createData.id, 'Booking creation must return booking object or id');

    createdBookingId = createData.booking?.id || createData.id;
    createdBookingRef = createData.booking?.ref || createData.ref;
    console.log(`  ✔ Booking created successfully: ID #${createdBookingId} (Ref: ${createdBookingRef})`);
    results.module_2_booking_create = 'pass';

    // -------------------------------------------------------------------------
    // MODULE 3: Admin Feed Sync & Tenant Isolation
    // -------------------------------------------------------------------------
    console.log('\n▶ [MODULE 3] Verifying Admin Bookings Feed Sync...');
    const adminFeedUrl = `${BASE_URL}/api/admin/bookings?tenant_id=${TENANT_ID}&dev_bypass=true`;
    const adminRes = await fetch(adminFeedUrl, {
      headers: {
        'Authorization': 'Bearer dev-bypass-token'
      }
    });

    assert.strictEqual(adminRes.status, 200, `Admin feed failed with status ${adminRes.status}`);
    const adminData = await adminRes.json();
    assert.ok(Array.isArray(adminData.bookings), 'Admin response must contain a "bookings" array');

    const syncedBooking = adminData.bookings.find(b => b.id === createdBookingId);
    assert.ok(syncedBooking, `Created booking #${createdBookingId} was not found in Admin feed for tenant "${TENANT_ID}"`);
    console.log(`  ✔ Confirmed booking #${createdBookingId} is visible in Admin feed with status "${syncedBooking.status}"`);
    results.module_3_admin_feed = 'pass';

    // -------------------------------------------------------------------------
    // MODULE 4: Status Mutation -> Confirmed
    // -------------------------------------------------------------------------
    console.log('\n▶ [MODULE 4] Testing Status Change: Pending -> Confirmed...');
    const confirmRes = await fetch(`${BASE_URL}/api/admin/bookings/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dev-bypass-token'
      },
      body: JSON.stringify({
        id: createdBookingId,
        status: 'confirmed',
        dev_bypass: true
      })
    });

    assert.strictEqual(confirmRes.status, 200, `Confirm status update failed with status ${confirmRes.status}`);
    const confirmData = await confirmRes.json();
    assert.strictEqual(confirmData.status || confirmData.booking?.status, 'confirmed', 'Booking status was not updated to confirmed');
    console.log(`  ✔ Booking status successfully updated to "confirmed"`);
    results.module_4_status_confirm = 'pass';

    // -------------------------------------------------------------------------
    // MODULE 5: Status Mutation -> Cancelled
    // -------------------------------------------------------------------------
    console.log('\n▶ [MODULE 5] Testing Status Change: Confirmed -> Cancelled...');
    const cancelRes = await fetch(`${BASE_URL}/api/admin/bookings/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer dev-bypass-token'
      },
      body: JSON.stringify({
        id: createdBookingId,
        status: 'cancelled',
        dev_bypass: true
      })
    });

    assert.strictEqual(cancelRes.status, 200, `Cancel status update failed with status ${cancelRes.status}`);
    const cancelData = await cancelRes.json();
    assert.strictEqual(cancelData.status || cancelData.booking?.status, 'cancelled', 'Booking status was not updated to cancelled');
    console.log(`  ✔ Booking status successfully updated to "cancelled"`);
    results.module_5_status_cancel = 'pass';

  } catch (err) {
    console.error('\n❌ TEST RUN ENCOUNTERED FAILURE:', err.message);
  }

  console.log(`\n======================================================`);
  console.log(`TEST SUITE EXECUTION SUMMARY:`);
  console.log(JSON.stringify(results, null, 2));
  console.log(`======================================================\n`);

  return results;
}

runTests();
