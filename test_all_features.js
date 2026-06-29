const assert = require('assert').strict;
const fs = require('fs');

const BASE_URL = 'http://127.0.0.1:8080/api';
const WS_BASE_URL = 'ws://127.0.0.1:8080/ws';

async function runTests() {
  console.log('🏁 Starting SecureWay Master Phased Features Verification...\n');
  
  const rand = Math.floor(Math.random() * 1000000);
  const orgDomain = `corporate-${rand}.com`;
  const adminEmail = `admin@${orgDomain}`;
  const devEmail = `developer@${orgDomain}`;
  const gmailEmail = `hacker_${rand}@gmail.com`;
  const password = 'Password123!';

  // --- PHASE 1: Domain-Based Auth + Org Auto-Mapping ---
  console.log('--- PHASE 1: Auth & Domain Rejection Checks ---');
  
  // 1. Check consumer email rejection (gmail)
  console.log(`Checking registration block on consumer email: ${gmailEmail}`);
  const rejectRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Hacker Gmail', email: gmailEmail, password })
  });
  assert.equal(rejectRes.status, 400, 'Consumer domain registration should be blocked (400)');
  const rejectData = await rejectRes.json();
  assert.ok(rejectData.error.includes('company email'), 'Rejection error should specify company email requirement');
  console.log('   Blocked response details:', rejectData.error);
  console.log('✅ Consumer email successfully blocked.');

  // 2. Register first corporate user (admin)
  console.log(`Registering first user: ${adminEmail}`);
  const reg1Res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Admin User', email: adminEmail, password })
  });
  assert.equal(reg1Res.status, 201, 'Admin registration should succeed (201)');
  const reg1Data = await reg1Res.json();
  const adminToken = reg1Data.token;
  const adminUserId = reg1Data.user.id;
  assert.equal(reg1Data.user.role, 'admin', 'First user of domain must be admin');
  console.log('✅ First user successfully registered as admin.');

  // 3. Register second corporate user (developer)
  console.log(`Registering second user of same domain: ${devEmail}`);
  const reg2Res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Dev User', email: devEmail, password })
  });
  assert.equal(reg2Res.status, 201, 'Developer registration should succeed (201)');
  const reg2Data = await reg2Res.json();
  const devToken = reg2Data.token;
  const devUserId = reg2Data.user.id;
  assert.equal(reg2Data.user.role, 'developer', 'Subsequent user of domain must be developer');
  assert.equal(reg2Data.user.org_id, reg1Data.user.org_id, 'Both users must belong to the same organization');
  console.log('✅ Second user successfully registered and mapped to same organization as developer.');


  // --- PHASE 2: Project Ownership Verification ---
  console.log('\n--- PHASE 2: Project Ownership & Scan Gating ---');
  
  // 1. Create project 1 (will be locked out)
  const proj1Res = await fetch(`${BASE_URL}/projects`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: 'locked-service',
      repo_url: 'https://github.com/corp/locked-service.git',
      language: 'Go'
    })
  });
  assert.equal(proj1Res.status, 201);
  const project1 = await proj1Res.json();
  const projectId1 = project1.id;
  
  // 2. Trigger scan on unverified project (should fail)
  console.log('Attempting scan trigger on unverified project...');
  const triggerFailRes = await fetch(`${BASE_URL}/projects/${projectId1}/trigger`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ trigger_type: 'manual' })
  });
  assert.equal(triggerFailRes.status, 403, 'Trigger scan should return 403 Forbidden');
  const triggerFailData = await triggerFailRes.json();
  assert.ok(triggerFailData.error.toLowerCase().includes('verified'), 'Error message must specify verification');
  console.log('    Blocked scan output:', triggerFailData.error);
  console.log('✅ Unverified scan trigger blocked.');

  // 3. Test 5 failed verification attempts lockout
  console.log('Testing 5-attempt rate-limit lockout on project 1...');
  for (let i = 1; i <= 5; i++) {
    const formData = new FormData();
    formData.append('file', new Blob(['incorrect-token-hash'], { type: 'text/plain' }), 'temp_bad_token.txt');
    const verifyFailRes = await fetch(`${BASE_URL}/projects/${projectId1}/verify`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` },
      body: formData
    });
    
    if (i < 5) {
      assert.equal(verifyFailRes.status, 400);
    } else {
      assert.equal(verifyFailRes.status, 429);
      const resData = await verifyFailRes.json();
      assert.ok(resData.error.toLowerCase().includes('lockout'), 'Error should indicate lockout');
      console.log(`✅ Attempt 5/5 rate-limited and locked out: ${resData.error}`);
    }
  }

  // 4. Create project 2 (will succeed verification)
  console.log('\nCreating second project for success path...');
  const proj2Res = await fetch(`${BASE_URL}/projects`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: 'critical-auth-payment-service',
      repo_url: 'https://github.com/corp/critical-auth-payment-service.git',
      language: 'Go'
    })
  });
  assert.equal(proj2Res.status, 201);
  const project2 = await proj2Res.json();
  const projectId2 = project2.id;

  // 5. Generate verification token
  console.log('Generating verification token for project 2...');
  const tokenRes = await fetch(`${BASE_URL}/projects/${projectId2}/generate-token`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert.equal(tokenRes.status, 200);
  const tokenData = await tokenRes.json();
  
  // 6. Verify with correct token
  console.log('Verifying project 2 with correct token file...');
  const goodFormData = new FormData();
  goodFormData.append('file', new Blob([tokenData.file_content], { type: 'text/plain' }), 'temp_good_token.txt');
  const verifySuccessRes = await fetch(`${BASE_URL}/projects/${projectId2}/verify`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` },
    body: goodFormData
  });
  assert.equal(verifySuccessRes.status, 200, 'Correct token upload should return 200');
  const verifySuccessData = await verifySuccessRes.json();
  assert.equal(verifySuccessData.project.verified, true, 'Project must be marked verified');
  console.log(`✅ Project 2 successfully verified (VerifiedAt: ${verifySuccessData.project.verified_at})`);


  // --- PHASE 3: Smart/Contextual Scan Engine ---
  console.log('\n--- PHASE 3: Smart Heuristic Scanning Engine ---');
  
  // Trigger scan over websocket and wait for completion
  console.log('Connecting to WebSocket & Triggering pipeline scan...');
  const ws = new WebSocket(`${WS_BASE_URL}?token=${adminToken}`);
  
  let scanId = '';
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('WebSocket scan listener timed out'));
    }, 15000);

    ws.onopen = async () => {
      const triggerRes = await fetch(`${BASE_URL}/projects/${projectId2}/trigger`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ trigger_type: 'manual' })
      });
      assert.equal(triggerRes.status, 202);
      const triggerData = await triggerRes.json();
      scanId = triggerData.id;
      console.log(`   Scan job triggered successfully: ${scanId}`);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const { event: wsEvent, payload } = data;
      if (wsEvent === 'scan.progress') {
        console.log(`   [Progress] Stage: ${payload.stage} (${payload.percent}%)`);
      } else if (wsEvent === 'scan.completed' && payload.scan_id === scanId) {
        console.log('✅ WebSocket received completed scan notification.');
        ws.close();
        clearTimeout(timeout);
        resolve();
      }
    };

    ws.onerror = (err) => reject(err);
  });

  // Verify scan heuristics
  console.log('Inspecting scan vulnerabilities result...');
  const vulnsRes = await fetch(`${BASE_URL}/scans/${scanId}/vulnerabilities`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert.equal(vulnsRes.status, 200);
  const vulns = await vulnsRes.json();
  
  // Ensure the language filters matched Go templates
  assert.ok(vulns.length > 0, 'Scan should return vulnerabilities');
  console.log(`✅ Heuristics scan generated ${vulns.length} vulnerabilities.`);
  const hasCriticalHigh = vulns.some(v => v.severity === 'critical' || v.severity === 'high');
  assert.ok(hasCriticalHigh, 'Sensitive project name keywords must shift weight to High/Critical alerts');
  console.log('✅ Sensitive name keyword heuristic validated (High/Critical threats shifted).');


  // --- PHASE 4: CI/CD Gate Policies ---
  console.log('\n--- PHASE 4: CI/CD Gate Policy ---');
  
  // Check default policy values
  const policyRes = await fetch(`${BASE_URL}/projects/${projectId2}/gate-policy`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert.equal(policyRes.status, 200);
  const policyData = await policyRes.json();
  assert.equal(policyData.block_on_critical, true, 'Default policy must block on Critical');
  
  // Inspect if the scan was flagged as passed/failed based on policy
  const scanJobRes = await fetch(`${BASE_URL}/scans/${scanId}`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const scanJob = await scanJobRes.json();
  console.log('   Gate passed status:', scanJob.gate_passed);
  // Since we had critical/high issues and block_on_critical is true, gate_passed must be false
  assert.equal(scanJob.gate_passed, false, 'Compliance gate should fail if critical vulnerabilities exist under default policy');
  console.log('✅ CI/CD Compliance Gate evaluation validated.');


  // --- PHASE 1 SAFEGUARDS: Member roles & Admin safeguarding ---
  console.log('\n--- PHASE 1 SAFEGUARDS: Workspace Member Safeguards ---');

  // 1. Get members list
  const membersRes = await fetch(`${BASE_URL}/org/members`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert.equal(membersRes.status, 200);
  const members = await membersRes.json();
  assert.equal(members.length, 2, 'Should return 2 members');
  console.log(`✅ Org members list loaded successfully (${members.length} members).`);

  // 2. Try to demote the only admin (self) -> should fail (0 admins safeguard)
  console.log('Attempting to demote the single admin to developer...');
  const demoteSelfRes = await fetch(`${BASE_URL}/org/members/${adminUserId}/role`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ role: 'developer' })
  });
  assert.equal(demoteSelfRes.status, 400, 'Demoting sole admin must be blocked');
  const demoteSelfData = await demoteSelfRes.json();
  assert.ok(demoteSelfData.error.includes('admin'), 'Error should mention admin safeguard');
  console.log('    Safeguard blocked output:', demoteSelfData.error);
  console.log('✅ Sole admin role demotion blocked by database safeguards.');

  // 3. Try to delete the only admin (self) -> should fail
  console.log('Attempting to delete the single admin...');
  const deleteSelfRes = await fetch(`${BASE_URL}/org/members/${adminUserId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert.equal(deleteSelfRes.status, 400, 'Deleting sole admin must be blocked');
  const deleteSelfData = await deleteSelfRes.json();
  assert.ok(deleteSelfData.error.includes('admin'), 'Error should mention admin safeguard');
  console.log('    Safeguard blocked output:', deleteSelfData.error);
  console.log('✅ Sole admin removal blocked by database safeguards.');

  // 4. Promote dev to admin
  console.log('Promoting developer user to admin...');
  const promoteRes = await fetch(`${BASE_URL}/org/members/${devUserId}/role`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ role: 'admin' })
  });
  assert.equal(promoteRes.status, 200);
  console.log('✅ Developer successfully promoted to admin.');

  // 5. Demoting original admin to developer should now succeed (since 1 admin remains)
  console.log('Demoting original admin to developer...');
  const demoteOldAdminRes = await fetch(`${BASE_URL}/org/members/${adminUserId}/role`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}` // Still signed in as admin in local state or until token refresh
    },
    body: JSON.stringify({ role: 'developer' })
  });
  assert.equal(demoteOldAdminRes.status, 200, 'Demoting original admin should succeed now');
  console.log('✅ Original admin demoted (new admin retains authority).');


  // --- PHASE 5: Audit Log Retrieval ---
  console.log('\n--- PHASE 5: Immutable Audit Logs ---');
  
  // 1. Retrieve logs as new admin (devUserId) -> should succeed
  console.log('Fetching audit logs as new admin user...');
  const logsAdminRes = await fetch(`${BASE_URL}/audit-log`, {
    headers: { 'Authorization': `Bearer ${devToken}` }
  });
  assert.equal(logsAdminRes.status, 200);
  const logsAdminData = await logsAdminRes.json();
  
  // Verify expected logs exist
  const actions = logsAdminData.entries.map(e => e.action);
  console.log('   Captured audit actions:', actions);
  assert.ok(actions.includes('user_login'), 'Should record login entries');
  assert.ok(actions.includes('project_verified'), 'Should record verification events');
  assert.ok(actions.includes('scan_triggered'), 'Should record scan trigger events');
  assert.ok(actions.includes('auth_denied'), 'Should record auth denials (safeguards/lockouts)');
  console.log('✅ All required audit trail registers verified successfully.');

  console.log('\n🎉 MASTER END-TO-END VERIFICATION COMPLETED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('\n❌ MASTER INTEGRATION TESTS FAILED:', err);
  process.exit(1);
});
