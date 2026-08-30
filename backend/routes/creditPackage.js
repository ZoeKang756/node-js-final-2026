const express = require('express')
const router = express.Router()
const { dataSource } = require('../db/data-source')
const logger = require('../utils/logger')('CreditPackageRouter')
const creditPackageController = require('../controllers/creditPackage')

const auth = require('../middlewares/auth')({
    secret: process.env.JWT_SECRET,
    userRepository: dataSource.getRepository('User'),
    logger
})
const isAdmin = require('../middlewares/isAdmin')

// 取得購買方案列表
router.get('/', creditPackageController.getAll);

// 新增購買方案
router.post('/', creditPackageController.postCreditPackage);

//[POST] 編輯組合包購買方案 (練習把編輯跟新增寫在一起)(最高管理員)
//router.put('/:packageId?', auth, isAdmin, creditPackageController.postCreditPackage);

// 刪除購買方案
router.delete('{/:creditPackageId}', creditPackageController.delCreditPackage);

// 購買堂數方案（需登入）
router.post('{/:creditPackageId}', auth, creditPackageController.creditPackagePurchase);

module.exports = router