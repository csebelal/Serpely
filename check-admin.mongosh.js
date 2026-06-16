use Serpely;
db.adminusers.find({}, {email: 1, passwordHash: 1}).forEach(printjson);
