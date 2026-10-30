/**
 * Worker entrypoint for durable background work.
 *
 * Run continuously (`npm run worker:delivery`) or invoke on a schedule from cron. Both work:
 * every pass is idempotent and claims only rows that are due.
 */
import 'dotenv/config'

import { data } from '../src/data/client'
import { connectDatabase } from '../src/db'
import { runDeliveryPass } from '../src/jobs/deliver-inquiries'
import { runSlaSweep } from '../src/jobs/sla-reminders'
import { recheckAndWithdraw } from '../src/lib/evidence/recheck'

const ONCE = process.argv.includes('--once')
const INTERVAL_MS = Number(process.env.WORKER_INTERVAL_MS || 15000)

async function main() {
  await connectDatabase()
  const db = data

  const pass = async () => {
    const delivery = await runDeliveryPass(db)
    if (delivery.claimed > 0) {
      console.log(
        `delivery: claimed=${delivery.claimed} sent=${delivery.sent} failed=${delivery.failed} dead=${delivery.dead}`,
      )
    }

    const sla = await runSlaSweep(db)
    if (sla.overdue > 0) {
      console.log(
        `sla: overdue=${sla.overdue} remindersQueued=${sla.remindersQueued} needsEscalationReview=${sla.flaggedForEscalationReview.length}`,
      )
    }

    // Evidence expiry sweep runs in report-only mode by default. Pass --withdraw to act.
    const withdraw = process.argv.includes('--withdraw')
    const evidence = await recheckAndWithdraw(db, { dryRun: !withdraw })
    if (evidence.findings.length > 0) {
      console.log(
        `evidence: publishedViolations=${evidence.findings.length} withdrawn=${evidence.withdrawn.length}` +
          (withdraw ? '' : ' (report only; pass --withdraw to unpublish)'),
      )
    }
  }

  await pass()

  if (ONCE) {
    console.log('single pass complete')
    process.exit(0)
  }

  console.log(`worker running; interval ${INTERVAL_MS}ms. Ctrl-C to stop.`)
  setInterval(() => {
    pass().catch((err) => console.error('worker pass failed:', err))
  }, INTERVAL_MS)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
