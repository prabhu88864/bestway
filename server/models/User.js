import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'
import bcrypt from 'bcryptjs'

const User = sequelize.define('User', {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  phone: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
   role: {
    type: DataTypes.ENUM("USER", "ADMIN"),
    allowNull: false,
    defaultValue: "USER",
  },

  
  // ✅ referral
  referralCode: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  sponsorId: { type: DataTypes.INTEGER, allowNull: true },

  // ✅ pair counters
  leftCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  rightCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  paidPairs: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  sponsorPaidPairs: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  
})

User.beforeCreate(async user => {
  user.password = await bcrypt.hash(user.password, 10)
})

export default User
