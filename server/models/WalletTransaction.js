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
      type: DataTypes.ENUM("TOPUP", "ORDER_PAYMENT", "REFUND",  
          "REFERRAL_JOIN_BONUS",   // 5000
      "PAIR_BONUS",            // 3000 (self)
      "DOWNLINE_PAIR_BONUS" ),
      allowNull: false,
    },

    orderId: { type: DataTypes.INTEGER, allowNull: true },
      meta: { type: DataTypes.JSON, allowNull: true },
  },
{ timestamps: true }
);

export default WalletTransaction;
