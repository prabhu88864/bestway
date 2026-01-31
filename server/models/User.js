import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";
import bcrypt from "bcryptjs";

const User = sequelize.define("User", {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  phone: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },

  role: {
    type: DataTypes.ENUM("USER", "ADMIN"),
    allowNull: false,
    defaultValue: "USER",
  },

  userType: {
    type: DataTypes.ENUM("TRAINEE_ENTREPRENEUR", "ENTREPRENEUR"),
    allowNull: false,
    defaultValue: "TRAINEE_ENTREPRENEUR",
  },

  profilePic: { type: DataTypes.STRING, allowNull: true },

  userID: { type: DataTypes.STRING(12), allowNull: false, unique: true },

  referralCode: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  sponsorId: { type: DataTypes.INTEGER, allowNull: true },

  leftCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  rightCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  paidPairs: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  sponsorPaidPairs: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
});

// ✅ generate userID BEFORE validation
User.beforeValidate(async (user, options) => {
  if (!user.userID) {
    const findOpts = { order: [["id", "DESC"]], attributes: ["id"] };
    if (options?.transaction) findOpts.transaction = options.transaction;

    const lastUser = await User.findOne(findOpts);
    const next = lastUser ? lastUser.id + 1 : 1;

    user.userID = "SUN" + String(next).padStart(6, "0");
  }
});

// ✅ hash only when password changed (prevents double hashing)
User.beforeSave(async (user) => {
  if (user.changed("password")) {
    user.password = await bcrypt.hash(user.password, 10);
  }
});

export default User;
