import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

const BinaryNode = sequelize.define("BinaryNode", {
  userId: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  parentId: { type: DataTypes.INTEGER, allowNull: true },
  position: { type: DataTypes.ENUM("LEFT", "RIGHT"), allowNull: true },
  leftChildId: { type: DataTypes.INTEGER, allowNull: true },
  rightChildId: { type: DataTypes.INTEGER, allowNull: true },
}, { timestamps: true });

export default BinaryNode;
