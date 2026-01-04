import express from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'

const router = express.Router()

// REGISTER
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password ,role} = req.body

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ msg: 'All fields are required' })
    }

    const exists = await User.findOne({ where: { email } })
    if (exists) return res.status(400).json({ msg: 'Email already exists' })

    const user = await User.create({ name, email, phone, password ,role})

    res.status(201).json({
      msg: 'User registered successfully',
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone,role: user.role },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ msg: 'Server error' })
  }
})

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ msg: 'Email and password required' })
    }

    const user = await User.findOne({ where: { email } })
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' })

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' })

   const token = jwt.sign(
  { id: user.id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: "1d" }
);

res.json({
  msg: "Login successful",
  token,
  user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role },
});
  } catch (err) {
    console.error(err)
    res.status(500).json({ msg: 'Server error' })
  }
})

export default router
