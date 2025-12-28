import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Wallet = sequelize.define(
  "Wallet",
  {
    userId: { type: DataTypes.INTEGER, allowNull: false, unique: true },

    balance: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  { timestamps: true }
);

export default Wallet;
