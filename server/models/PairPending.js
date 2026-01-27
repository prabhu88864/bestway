import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const PairPending = sequelize.define(
  "PairPending",
  {
    uplineUserId: { type: DataTypes.INTEGER, allowNull: false },
    side: { type: DataTypes.ENUM("LEFT", "RIGHT"), allowNull: false },
    downlineUserId: { type: DataTypes.INTEGER, allowNull: false },

    isUsed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    usedInPairMatchId: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    indexes: [
      { fields: ["uplineUserId", "side", "isUsed"] },
      { fields: ["downlineUserId"] },
    ],
  }
);

export default PairPending;
