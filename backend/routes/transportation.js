const express = require('express');
const router = express.Router();
const { BusOperator, Route, RouteStudent, Student } = require('../models');
const { verifyToken, requireRole, requireSameSchoolParam } = require('../middleware/auth');
const { requireModule } = require('../middleware/modules');
const { validate } = require('../middleware/validate');

// --- Operators ---
router.get('/:schoolId/operators', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('transportation'), async (req, res) => {
  try {
    const ops = await BusOperator.findAll({ where: { schoolId: req.params.schoolId }, order: [['status', 'ASC']] });
    const statusMap = { 'Approved': 'معتمد', 'Pending': 'قيد المراجعة', 'Rejected': 'مرفوض' };
    res.json(ops.map(o => ({ ...o.toJSON(), status: statusMap[o.status] || o.status })));
  } catch (e) { res.status(500).json({ msg: 'Server Error', error: e?.message }); }
});

router.post('/:schoolId/operators', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('transportation'), validate([
  { name: 'name', required: true, type: 'string' },
  { name: 'phone', required: true, type: 'string' },
  { name: 'licenseNumber', required: true, type: 'string' },
  { name: 'busPlateNumber', required: true, type: 'string' },
  { name: 'busCapacity', required: true },
  { name: 'busModel', required: true, type: 'string' },
]), async (req, res) => {
  try {
    const op = await BusOperator.create({ id: `op_${Date.now()}`, ...req.body, status: 'Pending', schoolId: parseInt(req.params.schoolId, 10) });
    const statusMap = { 'Approved': 'معتمد', 'Pending': 'قيد المراجعة', 'Rejected': 'مرفوض' };
    res.status(201).json({ ...op.toJSON(), status: statusMap[op.status] });
  } catch (e) { res.status(500).json({ msg: 'Server Error', error: e?.message }); }
});

router.put('/operator/:operatorId/approve', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireModule('transportation'), async (req, res) => {
  try {
    const op = await BusOperator.findByPk(req.params.operatorId);
    if (!op) return res.status(404).json({ msg: 'Operator not found' });
    if (req.user.role !== 'SUPER_ADMIN' && Number(op.schoolId || 0) !== Number(req.user.schoolId || 0)) return res.status(403).json({ msg: 'Access denied' });
    op.status = 'Approved';
    await op.save();
    res.json({ ...op.toJSON(), status: 'معتمد' });
  } catch (e) { res.status(500).json({ msg: 'Server Error', error: e?.message }); }
});

// --- Routes ---
router.get('/:schoolId/routes', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('transportation'), async (req, res) => {
  try {
    const routes = await Route.findAll({ where: { schoolId: req.params.schoolId }, order: [['name', 'ASC']] });
    const payload = [];
    for (const r of routes) {
      const rs = await RouteStudent.findAll({ where: { routeId: r.id } });
      payload.push({ ...r.toJSON(), studentIds: rs.map(x => x.studentId) });
    }
    res.json(payload);
  } catch (e) { res.status(500).json({ msg: 'Server Error', error: e?.message }); }
});

router.post('/:schoolId/routes', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('transportation'), validate([
  { name: 'name', required: true, type: 'string' },
  { name: 'busOperatorId', required: false, type: 'string' },
]), async (req, res) => {
  try {
    const route = await Route.create({ id: `rt_${Date.now()}`, name: req.body.name, schoolId: parseInt(req.params.schoolId, 10), busOperatorId: req.body.busOperatorId || null, departureTime: req.body.departureTime || null, stops: Array.isArray(req.body.stops) ? req.body.stops : [] });
    res.status(201).json({ ...route.toJSON(), studentIds: [] });
  } catch (e) { res.status(500).json({ msg: 'Server Error', error: e?.message }); }
});

router.put('/:schoolId/routes/:routeId/students', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('transportation'), validate([
  { name: 'studentIds', required: true },
]), async (req, res) => {
  try {
    const route = await Route.findByPk(req.params.routeId);
    if (!route) return res.status(404).json({ msg: 'Route not found' });
    // Replace assignments
    await RouteStudent.destroy({ where: { routeId: route.id } });
    const ids = Array.isArray(req.body.studentIds) ? req.body.studentIds : [];
    for (const sid of ids) {
      await RouteStudent.create({ routeId: route.id, studentId: sid });
    }
    res.json({ ...route.toJSON(), studentIds: ids });
  } catch (e) { res.status(500).json({ msg: 'Server Error', error: e?.message }); }
});

// Update route configuration (stops/departureTime/operator)
router.put('/:schoolId/routes/:routeId/config', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('transportation'), async (req, res) => {
  try {
    const route = await Route.findByPk(req.params.routeId);
    if (!route) return res.status(404).json({ msg: 'Route not found' });
    const { name, busOperatorId, departureTime, stops } = req.body || {};
    if (typeof name === 'string') route.name = name;
    if (busOperatorId !== undefined) route.busOperatorId = busOperatorId || null;
    if (typeof departureTime === 'string' || departureTime === null) route.departureTime = departureTime || null;
    if (stops !== undefined) route.stops = Array.isArray(stops) ? stops : route.stops;
    await route.save();
    const rs = await RouteStudent.findAll({ where: { routeId: route.id } });
    res.json({ ...route.toJSON(), studentIds: rs.map(x => x.studentId) });
  } catch (e) { res.status(500).send('Server Error'); }
});

// Parent transportation detail
router.get('/parent/:parentId', verifyToken, requireRole('PARENT'), requireModule('transportation'), async (req, res) => {
  try {
    const student = await Student.findOne({ where: { parentId: req.params.parentId } });
    if (!student) return res.json(null);
    const rs = await RouteStudent.findOne({ where: { studentId: student.id } });
    if (!rs) return res.json(null);
    const route = await Route.findByPk(rs.routeId);
    if (!route) return res.json(null);
    const operator = route.busOperatorId ? await BusOperator.findByPk(route.busOperatorId) : null;
    const statusMap = { 'Approved': 'معتمد', 'Pending': 'قيد المراجعة', 'Rejected': 'مرفوض' };
    let nearestStop = null;
    const stops = Array.isArray(route.stops) ? route.stops : [];
    const loc = student.homeLocation || {};
    const haversine = (lat1, lon1, lat2, lon2) => {
      const toRad = d => d * Math.PI / 180;
      const R = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };
    if (typeof loc.lat === 'number' && typeof loc.lng === 'number') {
      for (let i = 0; i < stops.length; i++) {
        const st = stops[i] || {};
        if (typeof st.lat !== 'number' || typeof st.lng !== 'number') continue;
        const d = haversine(loc.lat, loc.lng, st.lat, st.lng);
        if (!nearestStop || d < nearestStop.distanceKm) nearestStop = { name: st.name || '', lat: st.lat, lng: st.lng, time: st.time || null, distanceKm: Number(d.toFixed(2)) };
      }
    }
    res.json({ route: { ...route.toJSON(), studentIds: [] }, operator: operator ? { ...operator.toJSON(), status: statusMap[operator.status] } : null, nearestStop });
  } catch (e) { res.status(500).send('Server Error'); }
});

// Public Bus Operator Application
router.post('/operator/application', validate([
  { name: 'name', required: true, type: 'string' },
  { name: 'phone', required: true, type: 'string' },
  { name: 'licenseNumber', required: true, type: 'string' },
  { name: 'busPlateNumber', required: true, type: 'string' },
  { name: 'busCapacity', required: true },
  { name: 'busModel', required: true, type: 'string' },
  { name: 'schoolId', required: true },
]), async (req, res) => {
  try {
    const { schoolId, ...data } = req.body;
    const op = await BusOperator.create({
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      ...data,
      schoolId: parseInt(schoolId),
      status: 'Pending'
    });

    // Notify School Admin
    try {
      const { User, Notification } = require('../models');
      const schoolAdmins = await User.findAll({ where: { schoolId: schoolId, role: 'SCHOOL_ADMIN' } });
      for (const admin of schoolAdmins) {
        await Notification.create({
          type: 'Info', // Changed from DriverApplication to match DB Enum
          title: 'طلب انضمام سائق جديد',
          description: `تقدم ${data.name} بطلب للانضمام كأسطول نقل.`,
          userId: admin.id,
          isRead: false
        });
      }
    } catch (err) { console.error('Failed to notify admins', err); }

    res.status(201).json({ success: true, message: 'Application submitted successfully' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ msg: 'Server Error', error: e.message });
  }
});

module.exports = router;
/**
 * Simulation endpoint: POST /api/transportation/routes/:routeId/simulate
 * body: { progress: number } 0..100
 */
router.post('/routes/:routeId/simulate', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireModule('transportation'), validate([
  { name: 'progress', required: true },
]), async (req, res) => {
  try {
    const { progress } = req.body;
    const route = await Route.findByPk(req.params.routeId);
    if (!route) return res.status(404).json({ msg: 'Route not found' });
    if (req.user.role !== 'SUPER_ADMIN' && Number(route.schoolId || 0) !== Number(req.user.schoolId || 0)) return res.status(403).json({ msg: 'Access denied' });
    const rs = await RouteStudent.findAll({ where: { routeId: route.id } });
    const studentIds = rs.map(x => x.studentId);
    const students = await Student.findAll({ where: { id: studentIds } });
    const parents = students.map(s => s.parentId).filter(Boolean);
    const Notification = require('../models/Notification');
    if (progress >= 80 && progress < 100) {
      for (const pid of parents) {
        await Notification.create({ type: 'Info', title: 'الحافلة تقترب من المنزل', description: 'يرجى الاستعداد لاستقبال الطالب', parentId: pid });
      }
    }
    if (progress >= 100) {
      for (const pid of parents) {
        await Notification.create({ type: 'Info', title: 'وصل الطالب إلى المدرسة', description: 'تم تسجيل الوصول بنجاح', parentId: pid });
      }
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).send('Server Error'); }
});

// Auto-assign students to routes based on location and capacity
router.post('/:schoolId/auto-assign', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('transportation'), async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);
    const options = req.body || {};
    const mode = options.mode === 'text' ? 'text' : 'geo';
    const fillToCapacity = options.fillToCapacity !== false;
    const skipMissingLocation = options.skipMissingLocation !== false;

    const routes = await Route.findAll({ where: { schoolId } });
    const routeMap = {};
    for (const r of routes) {
      routeMap[r.id] = { route: r, operator: null, capacity: Infinity, assignedCount: 0 };
    }
    const opsById = {};
    for (const r of routes) {
      if (r.busOperatorId) {
        const op = await BusOperator.findByPk(r.busOperatorId);
        if (op && op.status === 'Approved') {
          opsById[op.id] = op;
          const cnt = await RouteStudent.count({ where: { routeId: r.id } });
          routeMap[r.id].operator = op;
          routeMap[r.id].capacity = Number(op.busCapacity) || Infinity;
          routeMap[r.id].assignedCount = cnt;
        }
      }
    }

    const existingAssignments = await RouteStudent.findAll({ where: { routeId: routes.map(r => r.id) } });
    const alreadyAssigned = new Set(existingAssignments.map(x => x.studentId));

    const students = await Student.findAll({ where: { schoolId, status: 'Active' } });
    const assigned = [];
    const skipped = [];

    const haversine = (lat1, lon1, lat2, lon2) => {
      const toRad = d => d * Math.PI / 180;
      const R = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const normalize = (s) => String(s || '').toLowerCase().trim();

    const fallbackToText = options.fallbackToText !== false;
    for (const s of students) {
      if (alreadyAssigned.has(s.id)) { skipped.push({ studentId: s.id, reason: 'already_assigned' }); continue; }
      const loc = s.homeLocation || {};
      let best = null;
      if (mode === 'geo' && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
        for (const r of routes) {
          const meta = routeMap[r.id];
          if (!meta.operator) continue;
          const stops = Array.isArray(r.stops) ? r.stops : [];
          for (let i = 0; i < stops.length; i++) {
            const st = stops[i] || {};
            if (typeof st.lat !== 'number' || typeof st.lng !== 'number') continue;
            const d = haversine(loc.lat, loc.lng, st.lat, st.lng);
            if (!best || d < best.distance) best = { routeId: r.id, stopIndex: i, stopName: st.name || '', distance: d };
          }
        }
      } else if (mode === 'text') {
        const city = normalize(loc.city);
        const address = normalize(loc.address);
        for (const r of routes) {
          const meta = routeMap[r.id];
          if (!meta.operator) continue;
          const target = normalize(r.name);
          let score = 0;
          if (city && target.includes(city)) score += 2;
          if (address && target.includes(address)) score += 1;
          const stops = Array.isArray(r.stops) ? r.stops : [];
          for (let i = 0; i < stops.length; i++) {
            const st = stops[i] || {};
            const sn = normalize(st.name);
            if (city && sn.includes(city)) score += 2;
            if (address && sn.includes(address)) score += 1;
            if (score > 0 && (!best || score > best.score)) best = { routeId: r.id, stopIndex: i, stopName: st.name || '', score };
          }
        }
      } else {
        if (skipMissingLocation) { skipped.push({ studentId: s.id, reason: 'missing_location' }); continue; }
      }

      if (!best && mode === 'geo' && fallbackToText) {
        const city = normalize(loc.city);
        const address = normalize(loc.address);
        for (const r of routes) {
          const meta = routeMap[r.id];
          if (!meta.operator) continue;
          const target = normalize(r.name);
          let score = 0;
          if (city && target.includes(city)) score += 2;
          if (address && target.includes(address)) score += 1;
          const stops = Array.isArray(r.stops) ? r.stops : [];
          for (let i = 0; i < stops.length; i++) {
            const st = stops[i] || {};
            const sn = normalize(st.name);
            if (city && sn.includes(city)) score += 2;
            if (address && sn.includes(address)) score += 1;
            if (score > 0 && (!best || score > best.score)) best = { routeId: r.id, stopIndex: i, stopName: st.name || '', score };
          }
        }
      }
      if (!best) { skipped.push({ studentId: s.id, reason: mode === 'geo' ? 'no_stops_with_coords' : 'no_text_match' }); continue; }
      const meta = routeMap[best.routeId];
      if (fillToCapacity && meta.assignedCount >= meta.capacity) { skipped.push({ studentId: s.id, reason: 'route_full', routeId: best.routeId }); continue; }
      await RouteStudent.create({ routeId: best.routeId, studentId: s.id });
      meta.assignedCount += 1;
      assigned.push({ studentId: s.id, routeId: best.routeId, stopIndex: best.stopIndex ?? null, stopName: best.stopName || '', distanceKm: best.distance ? Number(best.distance.toFixed(2)) : undefined });
    }

    const capacityMap = {};
    for (const r of routes) {
      const meta = routeMap[r.id];
      capacityMap[r.id] = { capacity: meta.capacity, assigned: meta.assignedCount };
    }

    res.json({ assigned, skipped, capacityMap });
  } catch (e) { res.status(500).send('Server Error'); }
});

// Preview auto-assign without persisting
router.post('/:schoolId/auto-assign/preview', verifyToken, requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'), requireSameSchoolParam('schoolId'), requireModule('transportation'), async (req, res) => {
  try {
    const schoolId = Number(req.params.schoolId);
    const options = req.body || {};
    const mode = options.mode === 'text' ? 'text' : 'geo';
    const fillToCapacity = options.fillToCapacity !== false;
    const skipMissingLocation = options.skipMissingLocation !== false;

    const routes = await Route.findAll({ where: { schoolId } });
    const routeMap = {};
    for (const r of routes) {
      routeMap[r.id] = { route: r, operator: null, capacity: Infinity, assignedCount: 0 };
    }
    for (const r of routes) {
      if (r.busOperatorId) {
        const op = await BusOperator.findByPk(r.busOperatorId);
        if (op && op.status === 'Approved') {
          const cnt = await RouteStudent.count({ where: { routeId: r.id } });
          routeMap[r.id].operator = op;
          routeMap[r.id].capacity = Number(op.busCapacity) || Infinity;
          routeMap[r.id].assignedCount = cnt;
        }
      }
    }

    const existingAssignments = await RouteStudent.findAll({ where: { routeId: routes.map(r => r.id) } });
    const alreadyAssigned = new Set(existingAssignments.map(x => x.studentId));

    const students = await Student.findAll({ where: { schoolId, status: 'Active' } });
    const assigned = [];
    const skipped = [];

    const haversine = (lat1, lon1, lat2, lon2) => {
      const toRad = d => d * Math.PI / 180;
      const R = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const normalize = (s) => String(s || '').toLowerCase().trim();

    const fallbackToText = options.fallbackToText !== false;
    for (const s of students) {
      if (alreadyAssigned.has(s.id)) { skipped.push({ studentId: s.id, reason: 'already_assigned' }); continue; }
      const loc = s.homeLocation || {};
      let best = null;
      if (mode === 'geo' && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
        for (const r of routes) {
          const meta = routeMap[r.id];
          if (!meta.operator) continue;
          const stops = Array.isArray(r.stops) ? r.stops : [];
          for (let i = 0; i < stops.length; i++) {
            const st = stops[i] || {};
            if (typeof st.lat !== 'number' || typeof st.lng !== 'number') continue;
            const d = haversine(loc.lat, loc.lng, st.lat, st.lng);
            if (!best || d < best.distance) best = { routeId: r.id, stopIndex: i, stopName: st.name || '', distance: d };
          }
        }
      } else if (mode === 'text') {
        const city = normalize(loc.city);
        const address = normalize(loc.address);
        for (const r of routes) {
          const meta = routeMap[r.id];
          if (!meta.operator) continue;
          const target = normalize(r.name);
          let score = 0;
          if (city && target.includes(city)) score += 2;
          if (address && target.includes(address)) score += 1;
          const stops = Array.isArray(r.stops) ? r.stops : [];
          for (let i = 0; i < stops.length; i++) {
            const st = stops[i] || {};
            const sn = normalize(st.name);
            if (city && sn.includes(city)) score += 2;
            if (address && sn.includes(address)) score += 1;
            if (score > 0 && (!best || score > best.score)) best = { routeId: r.id, stopIndex: i, stopName: st.name || '', score };
          }
        }
      } else {
        if (skipMissingLocation) { skipped.push({ studentId: s.id, reason: 'missing_location' }); continue; }
      }

      if (!best && mode === 'geo' && fallbackToText) {
        const city = normalize(loc.city);
        const address = normalize(loc.address);
        for (const r of routes) {
          const meta = routeMap[r.id];
          if (!meta.operator) continue;
          const target = normalize(r.name);
          let score = 0;
          if (city && target.includes(city)) score += 2;
          if (address && target.includes(address)) score += 1;
          const stops = Array.isArray(r.stops) ? r.stops : [];
          for (let i = 0; i < stops.length; i++) {
            const st = stops[i] || {};
            const sn = normalize(st.name);
            if (city && sn.includes(city)) score += 2;
            if (address && sn.includes(address)) score += 1;
            if (score > 0 && (!best || score > best.score)) best = { routeId: r.id, stopIndex: i, stopName: st.name || '', score };
          }
        }
      }
      if (!best) { skipped.push({ studentId: s.id, reason: mode === 'geo' ? 'no_stops_with_coords' : 'no_text_match' }); continue; }
      const meta = routeMap[best.routeId];
      if (fillToCapacity && meta.assignedCount >= meta.capacity) { skipped.push({ studentId: s.id, reason: 'route_full', routeId: best.routeId }); continue; }
      // simulate assignment without persisting
      meta.assignedCount += 1;
      assigned.push({ studentId: s.id, routeId: best.routeId, stopIndex: best.stopIndex ?? null, stopName: best.stopName || '', distanceKm: best.distance ? Number(best.distance.toFixed(2)) : undefined, score: best.score });
    }

    const capacityMap = {};
    for (const r of routes) {
      const meta = routeMap[r.id];
      capacityMap[r.id] = { capacity: meta.capacity, assigned: meta.assignedCount };
    }

    res.json({ assigned, skipped, capacityMap });
  } catch (e) { res.status(500).send('Server Error'); }
});
