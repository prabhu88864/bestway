import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const WalletTransaction = sequelize.define(
  "WalletTransaction",
  {
    walletId: { type: DataTypes.INTEGER, allowNull: false },

    type: {
      type: DataTypes.ENUM("CREDIT", "DEBIT"),
      allowNull: false,
    },

    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },

    reason: {
      type: DataTypes.ENUM("TOPUP", "ORDER_PAYMENT", "REFUND"),
      allowNull: false,
    },

    orderId: { type: DataTypes.INTEGER, allowNull: true },
  },
  { timestamps: true }
);

export default WalletTransaction;
