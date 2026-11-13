import test from 'node:test';
import assert from 'node:assert/strict';
import { computeVitals, parseCommands, simulateMission } from './physiology';
import { DEFAULT_CHECKIN, DEFAULT_OPTICAL, DEFAULT_VOICE } from '../data/defaults';

test('computeVitals responds to check-in answers', () => {
  const baseline = computeVitals(DEFAULT_OPTICAL, DEFAULT_VOICE, {
    meal: 'normal',
    hydration: 'good',
    head: 'clear',
    sleep: 'rested',
  });

  assert.equal(baseline.status, 'Nominal');
  assert.ok(baseline.spo2Pct >= 97 && baseline.spo2Pct <= 100);
  assert.ok(baseline.glucoseMgDl >= 85 && baseline.glucoseMgDl <= 105);
  assert.equal(baseline.heartRateMeasured, false);

  const stressed = computeVitals(DEFAULT_OPTICAL, DEFAULT_VOICE, {
    meal: 'just_ate',
    hydration: 'thirsty',
    head: 'headache',
    sleep: 'short',
  });

  assert.ok(stressed.glucoseMgDl > baseline.glucoseMgDl);
  assert.ok(stressed.onsdMm > baseline.onsdMm);
  assert.ok(stressed.hydrationPct < baseline.hydrationPct);
});

test('computeVitals prefers a measured camera heart rate', () => {
  const vitals = computeVitals(DEFAULT_OPTICAL, DEFAULT_VOICE, undefined, 71.6);
  assert.equal(vitals.heartRateBpm, 72);
  assert.equal(vitals.heartRateMeasured, true);
});

test('computeVitals applies manual overrides and detects early renal alert from high urea and low calcium', () => {
  const vitals = computeVitals(DEFAULT_OPTICAL, DEFAULT_VOICE, DEFAULT_CHECKIN, null, {
    glucoseMgDl: 158,
    systolic: 142,
    diastolic: 88,
    ureaMgDl: 48,
    calciumMgDl: 8.1,
    patchDay: 7,
    zwitterionicShield: true,
  });

  assert.equal(vitals.glucoseMgDl, 158);
  assert.equal(vitals.systolic, 142);
  assert.equal(vitals.diastolic, 88);
  assert.equal(vitals.renalRisk, 'Early Renal Alert');
  assert.equal(vitals.status, 'Critical');
  assert.equal(vitals.manualActive, true);
  assert.ok(vitals.sensorSensitivityPct >= 95);

  const unshieldedDay7 = computeVitals(DEFAULT_OPTICAL, DEFAULT_VOICE, DEFAULT_CHECKIN, null, {
    patchDay: 7,
    zwitterionicShield: false,
  });
  assert.ok(unshieldedDay7.sensorSensitivityPct < 60);
});

test('simulateMission rewards shielding and countermeasures', () => {
  const unprotected = simulateMission({
    gravity: '0g',
    days: 360,
    shielding: 10,
    solarStorm: true,
    lbnpMin: 0,
    exerciseMin: 0,
    co2MmHg: 4.8,
  });
  const protectedMars = simulateMission({
    gravity: '0.38g',
    days: 360,
    shielding: 40,
    solarStorm: false,
    lbnpMin: 45,
    exerciseMin: 75,
    co2MmHg: 2.2,
  });

  assert.ok(protectedMars.totalDoseMsv < unprotected.totalDoseMsv);
  assert.ok(protectedMars.totalAbsorbedMgy < unprotected.totalAbsorbedMgy);
  assert.ok(protectedMars.onsdMm < unprotected.onsdMm);
  assert.ok(protectedMars.monthlyBoneLossPct < unprotected.monthlyBoneLossPct);
  assert.equal(unprotected.status, 'Critical');
  assert.equal(protectedMars.radiationSimulated, true);
  assert.equal(protectedMars.timeline.length, 6);
});

test('mSv (Equivalent Dose) and mGy (Absorbed Dose) are independent and never use a fixed conversion factor', () => {
  const thinShieldOrbit = simulateMission({
    gravity: '0g',
    days: 180,
    shielding: 5,
    solarStorm: false,
    lbnpMin: 30,
    exerciseMin: 60,
    co2MmHg: 2.5,
  });
  const thickShieldOrbit = simulateMission({
    gravity: '0g',
    days: 180,
    shielding: 45,
    solarStorm: false,
    lbnpMin: 30,
    exerciseMin: 60,
    co2MmHg: 2.5,
  });
  const solarStormMars = simulateMission({
    gravity: '0.38g',
    days: 180,
    shielding: 10,
    solarStorm: true,
    lbnpMin: 30,
    exerciseMin: 60,
    co2MmHg: 2.5,
  });

  const ratioThin = thinShieldOrbit.totalDoseMsv / thinShieldOrbit.totalAbsorbedMgy;
  const ratioThick = thickShieldOrbit.totalDoseMsv / thickShieldOrbit.totalAbsorbedMgy;
  const ratioStormMars = solarStormMars.totalDoseMsv / solarStormMars.totalAbsorbedMgy;

  // Verify both units are positive and distinct
  assert.notEqual(thinShieldOrbit.totalDoseMsv, thinShieldOrbit.totalAbsorbedMgy);
  // Verify no fixed conversion factor exists between mSv and mGy across shielding and radiation spectra
  assert.ok(Math.abs(ratioThin - ratioThick) > 0.05);
  assert.ok(Math.abs(ratioThick - ratioStormMars) > 0.05);

  // Verify independent manual overrides do not convert one unit into the other
  const autoVitals = computeVitals(DEFAULT_OPTICAL, DEFAULT_VOICE, DEFAULT_CHECKIN, null, {});
  assert.equal(autoVitals.radiationSimulated, true);

  const manualMsvOnly = computeVitals(DEFAULT_OPTICAL, DEFAULT_VOICE, DEFAULT_CHECKIN, null, {
    equivalentDoseMsv: 310.5,
  });
  assert.equal(manualMsvOnly.equivalentDoseMsv, 310.5);
  assert.equal(manualMsvOnly.absorbedDoseMgy, autoVitals.absorbedDoseMgy);
  assert.equal(manualMsvOnly.radiationSimulated, false);
  assert.equal(manualMsvOnly.radiationRisk, 'Advisory');
});

test('parseCommands maps speech to actions', () => {
  const actions = parseCommands('Open the lab, I just ate and feel thirsty, set 450 days, and turn on camera');
  assert.deepEqual(actions, [
    { type: 'SWITCH_VIEW', view: 'lab' },
    { type: 'UPDATE_CHECKIN', patch: { meal: 'just_ate', hydration: 'thirsty' } },
    { type: 'SET_CAMERA', enabled: true },
    { type: 'UPDATE_MISSION', patch: { days: 450 } },
  ]);
});

test('parseCommands does not confuse microgravity with the microphone', () => {
  const actions = parseCommands('start a microgravity run');
  assert.deepEqual(actions, [{ type: 'SET_GRAVITY', gravity: '0g' }]);
});

test('parseCommands handles mic mute and unmute', () => {
  assert.deepEqual(parseCommands('mute my mic'), [{ type: 'SET_MIC', enabled: false }]);
  assert.deepEqual(parseCommands('unmute the microphone'), [{ type: 'SET_MIC', enabled: true }]);
});

test('parseCommands switches back to call view', () => {
  assert.deepEqual(parseCommands('switch to call'), [{ type: 'SWITCH_VIEW', view: 'call' }]);
});
