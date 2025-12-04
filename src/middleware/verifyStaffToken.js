const jwt = require('jsonwebtoken');
const JWT_SECRET = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30";

const verifyStaffToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    
    // CHẤP NHẬN CẢ ADMIN VÀ EMPLOYEE
    if (user.role === 'admin' || user.role === 'employee' || user.admin === true) {
      req.user = user;
      next();
    } else {
      return res.status(403).json({ message: 'Staff access required' });
    }
  });
};
module.exports = verifyStaffToken;