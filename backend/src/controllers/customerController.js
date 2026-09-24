const db = require('../config/db');

/**
 * Search customer by phone or name
 */
const searchCustomers = async (req, res) => {
  const { q } = req.query;

  try {
    let query = `SELECT * FROM customers`;
    const params = [];

    if (q) {
      query += ` WHERE phone ILIKE $1 OR full_name ILIKE $1 OR kyc_number ILIKE $1`;
      params.push(`%${q}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT 20`;
    const result = await db.query(query, params);

    return res.status(200).json({
      success: true,
      customers: result.rows,
    });
  } catch (error) {
    console.error('Customer search error:', error);
    return res.status(500).json({ success: false, message: 'Failed to search customers', error: error.message });
  }
};

/**
 * Create a new customer
 */
const createCustomer = async (req, res) => {
  const {
    fullName,
    phone,
    alternatePhone,
    email,
    address,
    kycType,
    kycNumber,
    kycDocumentUrl,
    customerPhotoUrl,
  } = req.body;

  if (!fullName || !phone || !address || !kycType || !kycNumber) {
    return res.status(400).json({
      success: false,
      message: 'Full name, phone, address, KYC type, and KYC number are required.',
    });
  }

  try {
    const insertQuery = `
      INSERT INTO customers (
        full_name, phone, alternate_phone, email, address,
        kyc_type, kyc_number, kyc_document_url, customer_photo_url, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;

    const result = await db.query(insertQuery, [
      fullName,
      phone,
      alternatePhone || null,
      email || null,
      address,
      kycType.toUpperCase(),
      kycNumber.toUpperCase(),
      kycDocumentUrl || null,
      customerPhotoUrl || null,
      req.user.id,
    ]);

    return res.status(201).json({
      success: true,
      message: 'Customer registered successfully',
      customer: result.rows[0],
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'A customer with this KYC Type and KYC Number already exists.',
      });
    }
    console.error('Customer create error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create customer', error: error.message });
  }
};

/**
 * Get customer by ID with loan history
 */
const getCustomerById = async (req, res) => {
  const { id } = req.params;

  try {
    const customerRes = await db.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (customerRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const loansRes = await db.query(
      `SELECT l.*, 
        COUNT(p.id) AS total_items_count,
        SUM(p.gross_weight_grams) AS total_gross_weight,
        SUM(p.net_weight_grams) AS total_net_weight
       FROM loans l
       LEFT JOIN pledged_items p ON l.id = p.loan_id
       WHERE l.customer_id = $1
       GROUP BY l.id
       ORDER BY l.start_date DESC`,
      [id]
    );

    return res.status(200).json({
      success: true,
      customer: customerRes.rows[0],
      loans: loansRes.rows,
    });
  } catch (error) {
    console.error('Customer fetch error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch customer details', error: error.message });
  }
};

module.exports = {
  searchCustomers,
  createCustomer,
  getCustomerById,
};
