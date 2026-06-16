const jwt = require('jsonwebtoken');
const { authenticate, requireRole } = require('../middleware/auth');

function mockRes() {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return res;
}

test('authenticate: no Authorization header → 401', () => {
  const req = { headers: {} };
  const res = mockRes();
  const next = jest.fn();
  authenticate(req, res, next);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(next).not.toHaveBeenCalled();
});

test('authenticate: "Bearer " with no token → 401', () => {
  const req = { headers: { authorization: 'Bearer ' } };
  const res = mockRes();
  const next = jest.fn();
  authenticate(req, res, next);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(next).not.toHaveBeenCalled();
});

test('authenticate: garbage JWT string → 401', () => {
  const req = { headers: { authorization: 'Bearer not.a.real.jwt' } };
  const res = mockRes();
  const next = jest.fn();
  authenticate(req, res, next);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(next).not.toHaveBeenCalled();
});

test('authenticate: valid JWT → calls next() and populates req.user', () => {
  const payload = { id: 'abc-123', email: 'doc@test.com', role: 'doctor', name: 'Dr Test' };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
  const req = { headers: { authorization: `Bearer ${token}` } };
  const res = mockRes();
  const next = jest.fn();
  authenticate(req, res, next);
  expect(next).toHaveBeenCalled();
  expect(res.status).not.toHaveBeenCalled();
  expect(req.user.email).toBe('doc@test.com');
  expect(req.user.role).toBe('doctor');
});

test('requireRole: wrong role → 403', () => {
  const req = { user: { role: 'doctor' } };
  const res = mockRes();
  const next = jest.fn();
  requireRole('admin')(req, res, next);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(next).not.toHaveBeenCalled();
});
