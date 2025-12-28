import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const Order = sequelize.define(
  "Order",
  {
    userId: { type: DataTypes.INTEGER, allowNull: false },

    totalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },

    status: {
      type: DataTypes.ENUM("PENDING", "PAID", "CANCELLED", "DELIVERED"),
      allowNull: false,
      defaultValue: "PENDING",
    },

    paymentMethod: {
      type: DataTypes.ENUM("COD", "WALLET", "RAZORPAY"),
      allowNull: false,
    },

    paymentStatus: {
      type: DataTypes.ENUM("PENDING", "SUCCESS", "FAILED"),
      allowNull: false,
      defaultValue: "PENDING",
    },
    deliveryCharge: {
  type: DataTypes.DECIMAL(10, 2),
  defaultValue: 0,
},

  },
  { timestamps: true }
);

export default Order;
