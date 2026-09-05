/**
 * Resolution knowledge base - closed cases the copilot retrieves from when it
 * is asked how a problem was handled before.
 *
 * Each template describes a failure signature that actually belongs to this
 * plant (Rieter ring frames, Trutzschler cards, Schlafhorst Autoconers, the
 * Central Testing Laboratory instruments, the export order book). Templates are
 * instantiated several times across the last two years against real machine
 * codes from the registry, so "we have seen this 4 times" is backed by rows.
 *
 * Durations, costs and dates are illustrative demo data.
 */
import type { AiIncident, AiResolutionStep, AiTopic, ProcessName, Severity } from '@/types'
import { makeRng } from '@/lib/random'
import { machines } from './machines'
import { factories } from './factories'

const rng = makeRng(7311)

interface IncidentTemplate {
  key: string
  topic: AiTopic
  category: string
  title: string
  symptom: string
  process?: ProcessName
  severity: Severity
  detectedBy: string
  rootCause: string
  contributingFactors: string[]
  resolutionSteps: AiResolutionStep[]
  preventiveAction: string
  outcome: string
  tags: string[]
  crew: string[]
  downtimeHrs: number
  outputLossKg: number
  costInr: number
  /** How many historical rows to generate for this signature. */
  occurrences: number
}

const step = (s: string, detail: string, durationHrs: number): AiResolutionStep => ({
  step: s,
  detail,
  durationHrs,
})

const templates: IncidentTemplate[] = [
  /* ------------------------------------------------ maintenance / breakdown */
  {
    key: 'spindle-bearing',
    topic: 'breakdown',
    category: 'Mechanical failure',
    title: 'Spindle bearing failure on ring frame',
    symptom:
      'Rising bearing temperature and audible growl at the spindle, followed by end breakages and a section of the frame stopping.',
    process: 'Ring Spinning',
    severity: 'critical',
    detectedBy: 'Shift operator - abnormal noise',
    rootCause:
      'Bearing housing starved of oil after the lubrication interval was stretched during a high-demand month; contaminated grease accelerated raceway pitting.',
    contributingFactors: [
      'Lubrication schedule slipped by 11 days against the monthly PM',
      'Cotton fly ingress at the housing seal',
      'Spindle running at the upper speed band for fine counts',
    ],
    resolutionSteps: [
      step('Isolate and tag out the frame', 'Stop the section, lock out drive power, secure the doffing zone.', 0.5),
      step('Strip the spindle assembly', 'Remove wharve, blade and bolster; log the failed bearing serial.', 1.0),
      step('Replace bearing and seal', 'Fit new bearing set from stores, renew the dust seal, repack with recommended grease.', 1.5),
      step('Align and torque', 'Re-seat the bolster, check spindle centring against the ring, torque to spec.', 0.75),
      step('Run-in and vibration check', 'Run 30 minutes at graded speed, confirm vibration and temperature within band.', 0.75),
      step('Restore production and monitor', 'Restart the section, watch end-breakage rate for one full shift.', 0.5),
    ],
    preventiveAction:
      'Lubrication moved to a fixed calendar trigger with sign-off, plus quarterly vibration screening on all spindles above 18,000 rpm.',
    outcome: 'Frame restored to full speed; no repeat on the same position since.',
    tags: ['spindle', 'bearing', 'lubrication', 'vibration', 'ring frame'],
    crew: ['eng-01', 'eng-13'],
    downtimeHrs: 5.0,
    outputLossKg: 1150,
    costInr: 68000,
    occurrences: 4,
  },
  {
    key: 'drive-motor-trip',
    topic: 'breakdown',
    category: 'Electrical failure',
    title: 'Drive motor tripped repeatedly',
    symptom:
      'Main drive tripping on overload within minutes of restart; inverter logging an overcurrent fault.',
    process: 'Ring Spinning',
    severity: 'critical',
    detectedBy: 'Electrical panel alarm',
    rootCause:
      'Cooling fan choked with cotton fly raised the motor winding temperature; the derated motor drew overcurrent and the VFD tripped on protection.',
    contributingFactors: [
      'Panel filter last cleaned outside the PM window',
      'Ambient temperature in the drive room above design',
      'Slightly high belt tension adding load torque',
    ],
    resolutionSteps: [
      step('Read and clear the fault log', 'Capture the VFD fault history before reset to keep the evidence.', 0.25),
      step('Thermal survey', 'Thermal camera on motor body, terminal box and drive panel under load.', 0.5),
      step('Clean cooling path', 'Blow out the fan cowl, replace panel filters, clear the fly build-up.', 1.0),
      step('Check insulation and connections', 'Megger the windings, re-torque terminals, verify phase balance.', 1.0),
      step('Re-tension the drive', 'Reset belt tension to spec and recheck running current.', 0.5),
      step('Staged restart', 'Restart at reduced speed, ramp up while watching current draw.', 0.75),
    ],
    preventiveAction:
      'Panel filter cleaning added to the weekly PM card and a temperature trend alarm set on the drive room.',
    outcome: 'Running current back inside nameplate; no further trips recorded.',
    tags: ['motor', 'vfd', 'overcurrent', 'cooling', 'electrical'],
    crew: ['eng-02', 'eng-05'],
    downtimeHrs: 4.0,
    outputLossKg: 890,
    costInr: 42000,
    occurrences: 3,
  },
  {
    key: 'spindle-tape',
    topic: 'breakdown',
    category: 'Mechanical failure',
    title: 'Spindle tape snapped across a section',
    symptom: 'A band of spindles stopped turning while the rest of the frame kept running.',
    process: 'Ring Spinning',
    severity: 'high',
    detectedBy: 'Doffer - stationary spindles',
    rootCause:
      'Tape fatigue at the jockey pulley: the pulley bearing had seized and worn a flat, cutting the tape edge.',
    contributingFactors: ['Jockey pulley beyond its service life', 'Tape tension above recommended range'],
    resolutionSteps: [
      step('Stop the section', 'Isolate the affected band and remove the broken tape.', 0.25),
      step('Replace jockey pulley', 'Fit a new pulley and bearing, confirm free rotation.', 0.75),
      step('Fit new tape set', 'Install matched tape, set tension with the gauge, not by feel.', 1.0),
      step('Verify spindle speed', 'Tachometer check across the band to confirm uniform rpm.', 0.5),
    ],
    preventiveAction: 'Jockey pulley free-rotation check added to the monthly PM walkdown.',
    outcome: 'Section back in production the same shift; spindle speed uniform within 1%.',
    tags: ['spindle tape', 'jockey pulley', 'ring frame', 'tension'],
    crew: ['eng-13', 'eng-01'],
    downtimeHrs: 2.5,
    outputLossKg: 420,
    costInr: 14500,
    occurrences: 3,
  },
  {
    key: 'clearer-sensor',
    topic: 'breakdown',
    category: 'Instrumentation fault',
    title: 'Yarn clearer sensor fault on Autoconer',
    symptom:
      'FR 900 clearer cutting good yarn on several drums and passing genuine faults on others; cone rejection climbing.',
    process: 'Winding',
    severity: 'high',
    detectedBy: 'Winding supervisor - rejection spike',
    rootCause:
      'Optical sensor head fouled with wax and fly, drifting the calibration reference; two heads had also lost their calibration after a firmware reset.',
    contributingFactors: [
      'Waxing station over-applying on fine counts',
      'Calibration not re-run after the last firmware update',
    ],
    resolutionSteps: [
      step('Quarantine affected cones', 'Hold the packages wound during the suspect window for re-test.', 0.5),
      step('Clean the sensor heads', 'Dry-clean optics on all drums to the OEM procedure.', 1.0),
      step('Recalibrate clearers', 'Run the calibration cone through each head, reset channel settings.', 1.5),
      step('Re-verify with lab', 'Send sample cones to the Central Testing Laboratory for imperfection check.', 2.0),
      step('Release or re-wind', 'Release cleared stock, re-wind the rest.', 1.0),
    ],
    preventiveAction:
      'Weekly optics cleaning added to the winding PM card; calibration made a mandatory step after any firmware change.',
    outcome: 'Cone rejection returned to baseline within one shift; no customer complaint raised.',
    tags: ['clearer', 'autoconer', 'sensor', 'calibration', 'rejection'],
    crew: ['eng-04', 'eng-09', 'eng-06'],
    downtimeHrs: 6.0,
    outputLossKg: 640,
    costInr: 31000,
    occurrences: 3,
  },
  {
    key: 'suction-pressure',
    topic: 'breakdown',
    category: 'Pneumatic system',
    title: 'Suction pressure drop across the frame',
    symptom:
      'Pneumafil suction weak at the far end of the frame, fly accumulating at the drafting zone and end breaks rising.',
    process: 'Ring Spinning',
    severity: 'high',
    detectedBy: 'Process check - end breakage rate',
    rootCause:
      'Choked filter drum and a split duct joint downstream bled the suction head before it reached the far spindles.',
    contributingFactors: ['Filter cleaning cycle extended', 'Duct gasket perished'],
    resolutionSteps: [
      step('Measure the pressure profile', 'Take suction readings along the frame to locate the drop.', 0.5),
      step('Clean the filter drum', 'Strip and clean the drum and pre-filter screens.', 1.0),
      step('Repair the duct joint', 'Replace the gasket and reseal the split joint.', 1.0),
      step('Rebalance the system', 'Reset damper positions and re-measure across all positions.', 0.75),
    ],
    preventiveAction: 'Suction pressure logged per shift at three fixed points, with a low-limit alarm.',
    outcome: 'Suction restored to spec; end breakage back to normal within the shift.',
    tags: ['suction', 'pneumafil', 'filter', 'end breakage', 'duct'],
    crew: ['eng-03', 'eng-11'],
    downtimeHrs: 3.25,
    outputLossKg: 510,
    costInr: 19000,
    occurrences: 3,
  },
  {
    key: 'comber-nipper',
    topic: 'breakdown',
    category: 'Setting deviation',
    title: 'Comber nipper misalignment',
    symptom:
      'Noil percentage jumped and sliver showed visible unevenness; downstream U% drifted upward.',
    process: 'Combing',
    severity: 'high',
    detectedBy: 'Quality - sliver test out of band',
    rootCause:
      'Nipper gauge shifted after a lap changeover, so the detaching timing no longer matched the set point.',
    contributingFactors: ['Changeover done without the gauge fixture', 'Worn nipper shaft bush'],
    resolutionSteps: [
      step('Stop and gauge the nipper', 'Confirm actual gauge against the setting chart.', 0.75),
      step('Replace the worn bush', 'Fit a new bush to remove the play at the shaft.', 1.25),
      step('Reset detaching timing', 'Re-time detaching and piecing with the fixture, both sides.', 1.5),
      step('Trial run and sliver test', 'Run a lap, send sliver for evenness testing before release.', 1.5),
    ],
    preventiveAction:
      'Gauge fixture made mandatory at every lap changeover, with a supervisor sign-off line on the changeover sheet.',
    outcome: 'Noil back to the target band; downstream U% recovered on the next test.',
    tags: ['comber', 'nipper', 'gauge', 'noil', 'setting'],
    crew: ['eng-03', 'eng-07'],
    downtimeHrs: 5.0,
    outputLossKg: 720,
    costInr: 26000,
    occurrences: 2,
  },
  {
    key: 'rotor-bearing-oe',
    topic: 'breakdown',
    category: 'Mechanical failure',
    title: 'Rotor bearing noise on Autocoro',
    symptom: 'Rotor whine on several positions with yarn faults appearing on the same drums.',
    process: 'Open End',
    severity: 'high',
    detectedBy: 'Shift engineer - noise and fault map',
    rootCause: 'Rotor bearing wear from extended running hours beyond the recommended change interval.',
    contributingFactors: ['Running hours tracked manually', 'Coarse count campaign extended without a bearing change'],
    resolutionSteps: [
      step('Map affected positions', 'Use the machine fault map to isolate the drums involved.', 0.5),
      step('Replace rotor bearings', 'Change bearings on the affected positions, clean rotor grooves.', 2.5),
      step('Balance and run-in', 'Run-in at graded speed, verify noise and yarn fault rate.', 1.0),
    ],
    preventiveAction: 'Rotor running hours moved onto the maintenance system with an automatic change alert.',
    outcome: 'Noise eliminated, position-level fault rate back to fleet average.',
    tags: ['rotor', 'open end', 'autocoro', 'bearing'],
    crew: ['eng-04', 'eng-09'],
    downtimeHrs: 4.0,
    outputLossKg: 980,
    costInr: 37000,
    occurrences: 2,
  },
  {
    key: 'tfo-tension',
    topic: 'breakdown',
    category: 'Setting deviation',
    title: 'TFO twist variation on doubled yarn',
    symptom: 'Twist per inch varying between spindles on a 2/60s lot; customer sample flagged.',
    process: 'TFO',
    severity: 'medium',
    detectedBy: 'Lab - TPI tester variation',
    rootCause: 'Spindle belt slip from a worn tension pulley left a group of spindles running below set speed.',
    contributingFactors: ['Belt beyond service life', 'Tension pulley spring fatigue'],
    resolutionSteps: [
      step('Speed audit', 'Tachometer sweep across all spindles to find the slow group.', 1.0),
      step('Replace belts and pulley springs', 'Fit new belts and springs on the affected block.', 2.0),
      step('Re-check TPI', 'Send samples for TPI testing across the block before release.', 1.5),
    ],
    preventiveAction: 'Quarterly spindle speed audit added for the TFO block.',
    outcome: 'TPI variation back inside tolerance; lot released without rework.',
    tags: ['tfo', 'twist', 'tpi', 'belt', 'doubling'],
    crew: ['eng-04', 'eng-06'],
    downtimeHrs: 4.5,
    outputLossKg: 380,
    costInr: 21000,
    occurrences: 2,
  },

  /* ---------------------------------------------------------------- quality */
  {
    key: 'csp-low',
    topic: 'quality',
    category: 'Yarn strength deviation',
    title: 'CSP below specification on combed yarn',
    symptom:
      'Count Strength Product readings falling short of the customer specification across consecutive lots.',
    process: 'Ring Spinning',
    severity: 'high',
    detectedBy: 'Central Testing Laboratory - CSP tester',
    rootCause:
      'Mixing drifted toward lower-strength bales after a supplier lot substitution; fibre strength at the mixing entry dropped below the plan.',
    contributingFactors: [
      'Substitute cotton lot approved on micronaire alone',
      'Comber noil set slightly low for the count',
      'Roving twist marginally under set point',
    ],
    resolutionSteps: [
      step('Hold the affected lots', 'Quarantine finished stock and stop dispatch on the affected count.', 0.5),
      step('Re-profile the mixing', 'Re-test contributing bales on HVI, rebuild the mixing to the strength target.', 6.0),
      step('Correct process settings', 'Lift comber noil and reset roving twist for the count.', 4.0),
      step('Re-spin a trial lot', 'Run a trial and test CSP, strength and evenness before scale-up.', 12.0),
      step('Release and re-test', 'Release stock on passing results, keep a tightened test frequency for a week.', 6.0),
    ],
    preventiveAction:
      'Bale approval now requires strength and staple, not micronaire alone; mixing strength target locked in the plan.',
    outcome: 'CSP back above specification on the trial lot; the held stock passed on re-test.',
    tags: ['csp', 'strength', 'mixing', 'cotton', 'combed'],
    crew: ['eng-07', 'eng-06', 'eng-14'],
    downtimeHrs: 0,
    outputLossKg: 1650,
    costInr: 148000,
    occurrences: 3,
  },
  {
    key: 'uster-unevenness',
    topic: 'quality',
    category: 'Evenness deviation',
    title: 'U% evenness outside tolerance',
    symptom: 'USTER UT5 evenness readings above the tolerance band with thin places rising.',
    process: 'Drawing',
    severity: 'medium',
    detectedBy: 'Central Testing Laboratory - USTER UT5',
    rootCause:
      'Worn top rollers and cots in the drafting zone allowed fibre slippage, showing up as periodic unevenness.',
    contributingFactors: ['Cot buffing overdue', 'Relative humidity below the target band at the drawing floor'],
    resolutionSteps: [
      step('Spectrogram analysis', 'Read the UT5 spectrogram to separate periodic from random faults.', 1.5),
      step('Buff and replace cots', 'Buff the top rollers, replace the worn cots and aprons.', 4.0),
      step('Correct humidity', 'Rebalance the humidification plant to the target RH band.', 2.0),
      step('Re-test the sliver', 'Re-run evenness on fresh sliver and confirm the periodic peak has gone.', 2.0),
    ],
    preventiveAction: 'Cot buffing interval shortened and floor RH added to the shift log with limits.',
    outcome: 'U% back inside tolerance; the periodic fault peak disappeared from the spectrogram.',
    tags: ['uster', 'evenness', 'u%', 'cots', 'drafting', 'humidity'],
    crew: ['eng-06', 'eng-11', 'eng-08'],
    downtimeHrs: 4.0,
    outputLossKg: 540,
    costInr: 46000,
    occurrences: 4,
  },
  {
    key: 'hairiness',
    topic: 'quality',
    category: 'Hairiness deviation',
    title: 'Hairiness index above customer limit',
    symptom: 'Zweigle hairiness readings above the agreed limit on a compact yarn export lot.',
    process: 'Ring Spinning',
    severity: 'medium',
    detectedBy: 'Central Testing Laboratory - Zweigle',
    rootCause:
      'Compact suction perforations partially blocked on the ComforSpin frame, so the compacting zone lost its condensing effect.',
    contributingFactors: ['Suction drum cleaning interval stretched', 'Traveller slightly heavy for the count'],
    resolutionSteps: [
      step('Isolate the affected spindles', 'Use the lot trace to map back to specific frames and positions.', 1.0),
      step('Clean the compacting zone', 'Clean perforated drums and apron, verify suction at the zone.', 3.0),
      step('Change travellers', 'Fit the correct traveller number for the count and speed.', 2.0),
      step('Re-test hairiness', 'Re-run Zweigle testing on fresh cones before releasing the lot.', 2.0),
    ],
    preventiveAction: 'Compacting-zone suction check added to the weekly card on all K44 frames.',
    outcome: 'Hairiness back under the customer limit; the export lot shipped on schedule.',
    tags: ['hairiness', 'compact', 'comforspin', 'suction', 'traveller'],
    crew: ['eng-06', 'eng-01'],
    downtimeHrs: 3.0,
    outputLossKg: 460,
    costInr: 58000,
    occurrences: 2,
  },
  {
    key: 'contamination',
    topic: 'quality',
    category: 'Contamination',
    title: 'Contamination complaint from an export customer',
    symptom: 'Customer reported foreign fibre and jute contamination in a shipped consignment.',
    process: 'Blow Room',
    severity: 'critical',
    detectedBy: 'Customer complaint',
    rootCause:
      'A bale batch arrived with jute wrapping fragments; the contamination sorting stage was short-staffed on the receiving shift.',
    contributingFactors: ['Supplier packing deviation', 'Sorting table manning below plan on C shift'],
    resolutionSteps: [
      step('Trace the consignment', 'Use lot traceability to identify every batch and cone from the same mixing.', 3.0),
      step('Contain remaining stock', 'Hold all related finished goods and re-inspect.', 4.0),
      step('Re-sort and re-run', 'Re-sort the affected raw stock and re-run the mixing.', 16.0),
      step('Supplier corrective action', 'Raise a formal deviation with the supplier on bale packing.', 4.0),
      step('Customer response', 'Issue an investigation report with corrective and preventive actions.', 6.0),
    ],
    preventiveAction:
      'Contamination sorting manning fixed for all three shifts and incoming bale packing added to the GRN checklist.',
    outcome: 'Customer accepted the corrective action plan; no repeat complaint from that account.',
    tags: ['contamination', 'complaint', 'traceability', 'export', 'bales'],
    crew: ['eng-07', 'eng-14', 'eng-08'],
    downtimeHrs: 0,
    outputLossKg: 2100,
    costInr: 320000,
    occurrences: 2,
  },
  {
    key: 'imperfections',
    topic: 'quality',
    category: 'Imperfections',
    title: 'Imperfections per 1000 m above target',
    symptom: 'Thick places and neps rising on carded counts across two frames.',
    process: 'Carding',
    severity: 'medium',
    detectedBy: 'Central Testing Laboratory - USTER UT5',
    rootCause: 'Card wire had lost its point sharpness beyond the grinding interval, letting neps carry through.',
    contributingFactors: ['Wire grinding overdue', 'Higher trash cotton in the running mixing'],
    resolutionSteps: [
      step('AFIS check on the sliver', 'Run AFIS PRO-2 to confirm neps are entering at carding.', 2.0),
      step('Grind or replace card wire', 'Grind the cylinder and flat wire, replace where beyond limit.', 8.0),
      step('Reset card settings', 'Reset flat-to-cylinder gauge and licker-in speed.', 3.0),
      step('Re-test', 'Re-run AFIS and yarn imperfection tests to confirm recovery.', 2.0),
    ],
    preventiveAction: 'Wire grinding moved onto a running-hours trigger instead of a calendar one.',
    outcome: 'Neps per gram down to the target band; yarn imperfections back under limit.',
    tags: ['neps', 'imperfections', 'carding', 'wire', 'afis'],
    crew: ['eng-03', 'eng-14', 'eng-06'],
    downtimeHrs: 9.0,
    outputLossKg: 1250,
    costInr: 94000,
    occurrences: 3,
  },

  /* ------------------------------------------------------------ order delay */
  {
    key: 'cotton-lot-delay',
    topic: 'orderDelay',
    category: 'Supply delay',
    title: 'Export order at risk from a delayed cotton lot',
    symptom:
      'Cotton lot cleared late at the lab, leaving the assigned mixing short and pushing the spinning start date.',
    severity: 'high',
    detectedBy: 'Planning - order risk review',
    rootCause:
      'Supplier shipment arrived four days late and the lot then queued behind other batches at the testing laboratory.',
    contributingFactors: [
      'No buffer lot approved for the count',
      'Lab test queue heavy the same week',
      'Order booked at a tight lead time',
    ],
    resolutionSteps: [
      step('Re-sequence the order book', 'Move the affected order ahead of lower-priority lots on the same count.', 2.0),
      step('Fast-track the lab test', 'Prioritise HVI and AFIS testing on the incoming lot.', 6.0),
      step('Substitute from approved stock', 'Release an equivalent approved lot from the godown to start spinning.', 4.0),
      step('Add a recovery shift', 'Run an extra shift on the assigned frames to claw back the lost days.', 24.0),
      step('Re-book the container', 'Coordinate a revised container booking with the freight forwarder.', 8.0),
    ],
    preventiveAction:
      'A buffer lot is now held approved for every count in the live order book, and lab priority follows order due dates.',
    outcome: 'Order shipped within the original delivery window using the recovery shift.',
    tags: ['cotton lot', 'delay', 'export', 'planning', 'lab queue'],
    crew: ['eng-10', 'eng-07', 'eng-08'],
    downtimeHrs: 0,
    outputLossKg: 0,
    costInr: 86000,
    occurrences: 4,
  },
  {
    key: 'breakdown-order-delay',
    topic: 'orderDelay',
    category: 'Capacity loss',
    title: 'Order slipped after a breakdown on the assigned frame',
    symptom: 'Committed order fell behind schedule when its assigned ring frame went down mid-run.',
    severity: 'high',
    detectedBy: 'Planning - production shortfall',
    rootCause: 'Unplanned breakdown removed the assigned frame from the plan for most of two shifts.',
    contributingFactors: ['Single-frame allocation with no alternate', 'Spare not in stock at the time'],
    resolutionSteps: [
      step('Reallocate to an alternate frame', 'Move the balance quantity to a frame running the same count group.', 3.0),
      step('Split the lot', 'Split across two frames to protect the due date.', 2.0),
      step('Expedite the spare', 'Raise an emergency purchase for the failed component.', 6.0),
      step('Recover with an extra shift', 'Add overtime on the alternate frames.', 16.0),
      step('Re-confirm the dispatch date', 'Update the customer with a firm revised date.', 1.0),
    ],
    preventiveAction:
      'Orders above a value threshold are now planned with a nominated alternate frame, and critical spares carry a minimum stock.',
    outcome: 'Order delivered two days behind the original plan, inside the customer tolerance.',
    tags: ['breakdown', 'order', 'reallocation', 'recovery', 'delay'],
    crew: ['eng-10', 'eng-08', 'eng-12'],
    downtimeHrs: 0,
    outputLossKg: 0,
    costInr: 112000,
    occurrences: 3,
  },
  {
    key: 'rework-delay',
    topic: 'orderDelay',
    category: 'Quality rework',
    title: 'Dispatch held while a lot went through rework',
    symptom: 'Finished lot failed final testing and had to be re-wound, holding the dispatch.',
    severity: 'medium',
    detectedBy: 'Quality - final lot clearance',
    rootCause: 'Cone package faults from a winding drum defect required the lot to be re-wound before clearance.',
    contributingFactors: ['Drum defect not caught at the shift check', 'Final test scheduled late in the cycle'],
    resolutionSteps: [
      step('Segregate the affected cones', 'Identify the drums involved and pull those packages.', 2.0),
      step('Repair the winding drum', 'Replace the defective drum and verify package build.', 3.0),
      step('Re-wind the lot', 'Re-wind on cleared drums with a tightened inspection.', 10.0),
      step('Re-test and release', 'Full re-test at the laboratory before dispatch clearance.', 4.0),
    ],
    preventiveAction: 'Package build inspection moved earlier, to the first shift of every new lot.',
    outcome: 'Lot cleared on re-test and dispatched one day late.',
    tags: ['rework', 'winding', 'dispatch', 'cone', 'quality hold'],
    crew: ['eng-09', 'eng-06', 'eng-04'],
    downtimeHrs: 3.0,
    outputLossKg: 240,
    costInr: 64000,
    occurrences: 3,
  },
  {
    key: 'container-booking',
    topic: 'orderDelay',
    category: 'Logistics',
    title: 'Container booking delay on an export shipment',
    symptom: 'Goods ready at the warehouse but the container booking rolled to a later vessel.',
    severity: 'medium',
    detectedBy: 'Dispatch - booking confirmation',
    rootCause: 'Peak-season space shortage on the shipping line rolled the booking by one sailing.',
    contributingFactors: ['Single forwarder dependency', 'Booking raised close to the ready date'],
    resolutionSteps: [
      step('Check alternate sailings', 'Compare space and transit across alternate lines.', 4.0),
      step('Re-book with a second forwarder', 'Confirm space on an earlier sailing with the alternate.', 6.0),
      step('Update documentation', 'Amend shipping documents to the new vessel and dates.', 4.0),
      step('Inform the customer', 'Communicate the revised arrival window with the tracking reference.', 1.0),
    ],
    preventiveAction: 'Container space is now booked at order confirmation, not at goods-ready, for peak months.',
    outcome: 'Shipment left on an earlier alternate sailing, recovering most of the lost time.',
    tags: ['container', 'export', 'logistics', 'shipping', 'booking'],
    crew: ['eng-10'],
    downtimeHrs: 0,
    outputLossKg: 0,
    costInr: 48000,
    occurrences: 2,
  },

  /* --------------------------------------------------------- production/cap */
  {
    key: 'production-shortfall',
    topic: 'production',
    category: 'Output shortfall',
    title: 'Weekly output below target across a unit',
    symptom: 'Actual production trailing the daily target for most of the week, worst on the weekend shifts.',
    severity: 'high',
    detectedBy: 'Production review - actual vs target',
    rootCause:
      'A combination of lost hours from breakdowns, a slow count changeover and reduced C-shift manning over the weekend.',
    contributingFactors: [
      'Two frames down in the same window',
      'Changeover took longer than the standard',
      'Weekend absenteeism above plan',
    ],
    resolutionSteps: [
      step('Break down the variance', 'Split the shortfall into downtime, speed and manning losses.', 3.0),
      step('Clear the downtime backlog', 'Return the down frames to service as first priority.', 8.0),
      step('Standardise the changeover', 'Run the changeover against a written standard and time it.', 6.0),
      step('Rebalance shift manning', 'Cover the weekend gap with a planned relief roster.', 4.0),
      step('Track daily recovery', 'Review actual vs target daily until the gap closes.', 12.0),
    ],
    preventiveAction:
      'Changeover standard published per count group, and weekend relief manning fixed in the roster.',
    outcome: 'Output back on target within six days; changeover time down by roughly a third.',
    tags: ['output', 'target', 'shortfall', 'changeover', 'manning', 'oee'],
    crew: ['eng-08', 'eng-05', 'eng-10'],
    downtimeHrs: 0,
    outputLossKg: 4800,
    costInr: 260000,
    occurrences: 3,
  },
  {
    key: 'oee-drop',
    topic: 'production',
    category: 'OEE decline',
    title: 'OEE decline on a group of frames',
    symptom: 'Overall equipment effectiveness drifting down on a block of frames without a single obvious failure.',
    process: 'Ring Spinning',
    severity: 'medium',
    detectedBy: 'Machine dashboard - OEE trend',
    rootCause:
      'Accumulated micro-stoppages: end breaks, doffing delays and short waits for material, none individually large.',
    contributingFactors: ['End breakage rate creeping up', 'Doffing cycle not standardised across shifts'],
    resolutionSteps: [
      step('Log micro-stoppages', 'Capture every stop above 30 seconds for two full shifts.', 16.0),
      step('Attack the top two causes', 'Fix the largest contributors first - usually end breaks and doffing waits.', 8.0),
      step('Standardise doffing', 'Set one doffing method and train all three shifts to it.', 6.0),
      step('Re-measure OEE', 'Compare OEE over the following week against the baseline.', 8.0),
    ],
    preventiveAction: 'Micro-stoppage logging kept as a monthly routine on the lowest-OEE block.',
    outcome: 'OEE recovered several points on the block within two weeks.',
    tags: ['oee', 'micro stoppage', 'end breakage', 'doffing', 'utilisation'],
    crew: ['eng-08', 'eng-01', 'eng-05'],
    downtimeHrs: 0,
    outputLossKg: 2200,
    costInr: 135000,
    occurrences: 2,
  },
  {
    key: 'capacity-bottleneck',
    topic: 'capacity',
    category: 'Bottleneck',
    title: 'Doubling capacity constrained at TFO',
    symptom: 'Double-yarn orders queuing behind TFO while spinning capacity sat available upstream.',
    process: 'TFO',
    severity: 'medium',
    detectedBy: 'Capacity planning - process balance',
    rootCause: 'TFO throughput below the order mix requirement after a shift toward finer doubled counts.',
    contributingFactors: ['Order mix moved to 2/100s and 2/140s', 'One TFO block under maintenance'],
    resolutionSteps: [
      step('Model the balance', 'Run the capacity plan to size the exact gap at TFO.', 4.0),
      step('Re-sequence the queue', 'Prioritise the orders closest to their due dates.', 3.0),
      step('Restore the block', 'Complete the outstanding maintenance and bring the block back.', 12.0),
      step('Add a shift on TFO', 'Run the constrained block on an extra shift while the queue clears.', 24.0),
    ],
    preventiveAction:
      'TFO load is now checked against the order mix at booking, before the order is confirmed.',
    outcome: 'Queue cleared inside two weeks and the due dates held.',
    tags: ['tfo', 'capacity', 'bottleneck', 'doubling', 'planning'],
    crew: ['eng-10', 'eng-04', 'eng-08'],
    downtimeHrs: 0,
    outputLossKg: 0,
    costInr: 78000,
    occurrences: 2,
  },

  /* ------------------------------------------------------------------ energy */
  {
    key: 'energy-spike',
    topic: 'energy',
    category: 'Specific energy deviation',
    title: 'kWh per kg above benchmark',
    symptom: 'Specific energy consumption drifting above the unit benchmark without a production change.',
    severity: 'medium',
    detectedBy: 'Energy dashboard - kWh/kg trend',
    rootCause:
      'Compressed air leaks and a humidification plant running above the required set point pushed non-productive load up.',
    contributingFactors: [
      'Leak survey overdue',
      'Humidification set point raised manually and never reset',
      'Idle running during changeovers',
    ],
    resolutionSteps: [
      step('Break the load down', 'Split consumption by end use to find where the excess sits.', 4.0),
      step('Ultrasonic leak survey', 'Survey the compressed air network and tag every leak.', 8.0),
      step('Repair leaks', 'Fix the tagged leaks in priority order.', 12.0),
      step('Reset humidification', 'Return the set point to the target RH band and lock the control.', 3.0),
      step('Re-benchmark', 'Re-measure kWh/kg over a full week against the benchmark.', 6.0),
    ],
    preventiveAction:
      'Quarterly leak survey scheduled and humidification set points put under change control.',
    outcome: 'Specific energy back to the benchmark band with a measurable monthly saving.',
    tags: ['energy', 'kwh/kg', 'compressed air', 'humidification', 'leak'],
    crew: ['eng-11', 'eng-02'],
    downtimeHrs: 0,
    outputLossKg: 0,
    costInr: 92000,
    occurrences: 3,
  },
  {
    key: 'power-factor',
    topic: 'energy',
    category: 'Electrical efficiency',
    title: 'Power factor penalty on the monthly bill',
    symptom: 'Utility bill carried a power factor penalty for the month.',
    severity: 'low',
    detectedBy: 'Utilities - bill review',
    rootCause: 'Two capacitor bank steps had failed, dropping correction below the required threshold.',
    contributingFactors: ['Capacitor health not monitored', 'Contactor welded on one step'],
    resolutionSteps: [
      step('Test the capacitor banks', 'Measure each step and identify the failed units.', 3.0),
      step('Replace failed steps', 'Fit replacement capacitors and the failed contactor.', 5.0),
      step('Verify correction', 'Confirm power factor across the load profile.', 2.0),
    ],
    preventiveAction: 'Monthly capacitor bank health check added to the utilities routine.',
    outcome: 'Power factor restored above the threshold; penalty removed from the following bill.',
    tags: ['power factor', 'capacitor', 'energy', 'penalty', 'electrical'],
    crew: ['eng-11', 'eng-02'],
    downtimeHrs: 0,
    outputLossKg: 0,
    costInr: 55000,
    occurrences: 2,
  },

  /* --------------------------------------------------------------- inventory */
  {
    key: 'finished-goods-low',
    topic: 'inventory',
    category: 'Stock below reorder',
    title: 'Finished yarn stock fell below reorder level',
    symptom: 'Finished yarn cover dropped under the reorder level with committed orders still to serve.',
    severity: 'high',
    detectedBy: 'Inventory dashboard - reorder alert',
    rootCause:
      'Dispatches ran ahead of replenishment for two weeks while spinning output was suppressed by downtime.',
    contributingFactors: ['Downtime week upstream', 'Heavy dispatch schedule', 'Reorder level not revised for the new order mix'],
    resolutionSteps: [
      step('Rank the exposure', 'List committed orders against available stock by count.', 3.0),
      step('Re-prioritise production', 'Push the short counts to the front of the plan.', 4.0),
      step('Stage dispatch', 'Sequence dispatches so the tightest due dates are served first.', 3.0),
      step('Revise reorder levels', 'Reset reorder points against the current order mix.', 4.0),
    ],
    preventiveAction: 'Reorder levels reviewed monthly against the live order book rather than annually.',
    outcome: 'Cover rebuilt above the reorder level within nine days with no missed dispatch.',
    tags: ['inventory', 'reorder', 'finished yarn', 'stock', 'cover'],
    crew: ['eng-10', 'eng-08', 'eng-12'],
    downtimeHrs: 0,
    outputLossKg: 0,
    costInr: 70000,
    occurrences: 3,
  },
  {
    key: 'spares-stockout',
    topic: 'inventory',
    category: 'Spares stockout',
    title: 'Critical spare out of stock during a breakdown',
    symptom: 'Repair held up because the required spare was below stock at the moment of failure.',
    severity: 'high',
    detectedBy: 'Maintenance - spares issue request',
    rootCause: 'Reorder level set too low for a part with a long supplier lead time.',
    contributingFactors: ['Lead time underestimated', 'Consumption rate rose after a speed increase'],
    resolutionSteps: [
      step('Emergency sourcing', 'Locate the part with an alternate vendor or a sister unit.', 6.0),
      step('Temporary restoration', 'Run a safe temporary fix to restore partial output.', 4.0),
      step('Fit the correct part', 'Complete the permanent repair once the spare arrives.', 3.0),
      step('Reset the reorder level', 'Recalculate reorder point from real lead time and consumption.', 2.0),
    ],
    preventiveAction: 'Critical spares list rebuilt with lead-time-based reorder points and a minimum stock rule.',
    outcome: 'Machine restored the next day; the part now carries a safety stock.',
    tags: ['spares', 'stockout', 'reorder', 'lead time', 'maintenance'],
    crew: ['eng-12', 'eng-04', 'eng-05'],
    downtimeHrs: 14.0,
    outputLossKg: 1900,
    costInr: 158000,
    occurrences: 3,
  },

  /* ------------------------------------------------------------- procurement */
  {
    key: 'supplier-quality',
    topic: 'procurement',
    category: 'Supplier deviation',
    title: 'Incoming cotton lot rejected at testing',
    symptom: 'A received lot failed at HVI on staple and trash against the purchase specification.',
    severity: 'medium',
    detectedBy: 'Central Testing Laboratory - HVI',
    rootCause: 'Supplier shipped against a different gin lot than the one sampled at purchase.',
    contributingFactors: ['Pre-shipment sample not sealed to the gin lot', 'Spot purchase under time pressure'],
    resolutionSteps: [
      step('Formally reject the lot', 'Raise the rejection with test evidence against the specification.', 2.0),
      step('Secure a replacement', 'Confirm a replacement lot or an alternate approved supplier.', 8.0),
      step('Protect the mixing plan', 'Bridge with approved godown stock so spinning is not interrupted.', 4.0),
      step('Tighten the terms', 'Add sealed-sample and gin-lot traceability to the purchase terms.', 4.0),
    ],
    preventiveAction: 'Sealed pre-shipment samples tied to the gin lot are now a condition of purchase.',
    outcome: 'Replacement lot cleared testing; no interruption to the mixing plan.',
    tags: ['supplier', 'cotton', 'rejection', 'hvi', 'procurement'],
    crew: ['eng-14', 'eng-07'],
    downtimeHrs: 0,
    outputLossKg: 0,
    costInr: 88000,
    occurrences: 2,
  },
]

/* ------------------------------------------------------------- instantiate */

const factoryIds = factories.map((f) => f.id)

function isoDaysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(rng.int(6, 21), rng.int(0, 59), 0, 0)
  return d.toISOString()
}

/** Machines that can carry a case for the given process, so codes stay real. */
function machineFor(process?: ProcessName) {
  if (!process) return undefined
  const pool = machines.filter((m) => m.process === process)
  return pool.length ? rng.pick(pool) : undefined
}

let seq = 0

export const incidents: AiIncident[] = templates.flatMap((template) =>
  Array.from({ length: template.occurrences }, (_, i) => {
    const machine = machineFor(template.process)
    const spread = 30 + i * 110
    const daysAgo = rng.int(spread, spread + 100)
    const drift = 0.82 + rng.next() * 0.4
    seq += 1
    return {
      id: `inc-${String(seq).padStart(3, '0')}`,
      refNo: `INC-${new Date().getFullYear() - (daysAgo > 365 ? 1 : 0)}-${String(seq).padStart(4, '0')}`,
      title: template.title,
      topic: template.topic,
      category: template.category,
      symptom: template.symptom,
      machineCode: machine?.code,
      process: template.process,
      factoryId: (machine?.factoryId ?? rng.pick(factoryIds)) as AiIncident['factoryId'],
      occurredAt: isoDaysAgo(daysAgo),
      severity: template.severity,
      detectedBy: template.detectedBy,
      rootCause: template.rootCause,
      contributingFactors: template.contributingFactors,
      resolutionSteps: template.resolutionSteps,
      resolvedByIds: template.crew,
      downtimeHrs: Math.round(template.downtimeHrs * drift * 4) / 4,
      outputLossKg: Math.round((template.outputLossKg * drift) / 10) * 10,
      costInr: Math.round((template.costInr * drift) / 500) * 500,
      preventiveAction: template.preventiveAction,
      recurrence: template.occurrences,
      tags: template.tags,
      outcome: template.outcome,
    }
  }),
)

incidents.sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))

export const incidentById = new Map(incidents.map((i) => [i.id, i]))

/** Signature keys, useful for grouping "we have seen this N times" views. */
export const incidentTopics = [...new Set(incidents.map((i) => i.topic))]
