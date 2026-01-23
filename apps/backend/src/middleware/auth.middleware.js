import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
export function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // gắn user vào request
        next();
    }
    catch (error) {
        return res.status(401).json({ message: "Invalid token" });
    }
}
export function authorizeRoles(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Forbidden" });
        }
        next();
    };
}
console.log("AUTH MIDDLEWARE SECRET =", process.env.JWT_SECRET);
