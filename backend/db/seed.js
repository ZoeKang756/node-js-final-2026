const { dataSource } = require('./data-source')

/** 清空：被 FK 指著的表最後刪（先刪 COURSE，再 USER / SKILL）。 */
async function clearAll() {
  for (const name of ['Course', 'User', 'Skill', 'CreditPackage']) {
    if (dataSource.hasMetadata(name)) {
      await dataSource.createQueryBuilder().delete().from(name).execute()
    }
  }
}

async function main() {
  await dataSource.initialize()
  await clearAll()

  // TODO：種資料
  //   1. 先種「被指著」的表：SKILL 三筆（拳擊、游泳、皮拉提斯）、USER 兩位教練
  //   2. 再種 COURSE 四堂課——relation 直接塞整個物件：
  //      courseRepo.save({ name: '...', user: 教練物件, skill: 技能物件 })
  //   3. CreditPackage 三筆
  const skillRepo = dataSource.getRepository('Skill')
  const userRepo = dataSource.getRepository('User')
  const courseRepo = dataSource.getRepository('Course')
  const packageRepo = dataSource.getRepository('CreditPackage')

  // 1. 先種「被指著」的表：SKILL、USER（COURSE 的外來鍵指著它們）
  const [boxing, swimming, pilates] = await skillRepo.save([
    { name: '拳擊' },
    { name: '游泳' },
    { name: '皮拉提斯' },
  ])

  const [ming, hua] = await userRepo.save([
    { name: '阿明教練', email: 'coach.ming@livefit.tw', role: 'COACH' },
    { name: '小花教練', email: 'coach.hua@livefit.tw', role: 'COACH' },
  ])

  // 2. 再種 COURSE：relation 直接塞整個物件，TypeORM 自己把 id 填進 user_id / skill_id
  await courseRepo.save([
    { name: '拳擊有氧', description: '邊出拳邊燃脂', start_at: '2026-08-03 19:00:00', end_at: '2026-08-03 20:00:00', max_participants: 16, user: ming, skill: boxing },
    { name: '自由式入門', description: '從換氣開始練', start_at: '2026-08-05 07:00:00', end_at: '2026-08-05 08:00:00', max_participants: 8, user: hua, skill: swimming },
    { name: '核心皮拉提斯', description: '躺著也很累', start_at: '2026-08-06 19:00:00', end_at: '2026-08-06 20:00:00', max_participants: 12, user: hua, skill: pilates },
    { name: '水中體適能', description: '對膝蓋友善的全身運動', start_at: '2026-08-08 10:00:00', end_at: '2026-08-08 11:00:00', max_participants: 10, user: ming, skill: swimming },
  ])

  // 3. 組合包（單表，跟上面三張沒關聯）
  await packageRepo.save([
    { name: '7 堂組合包方案', credit_amount: 7, price: 1400 },
    { name: '14 堂組合包方案', credit_amount: 14, price: 2520 },
    { name: '21 堂組合包方案', credit_amount: 21, price: 4800 },
  ])

  console.log('🌱 seed 完成')
  await dataSource.destroy()
}

main().catch((e) => { console.error('seed 失敗：', e.message); process.exit(1) })
