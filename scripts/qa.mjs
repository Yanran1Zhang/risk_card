import { chromium } from 'playwright-core'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const outputDir = path.resolve('qa-output')
await mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: true,
})

const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
const waitForDetails = async () => {
  await page.waitForTimeout(280)
  await page.locator('.detail-modal[data-loading="false"] tbody tr').first().waitFor()
}

await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' })
if ((await page.locator('h1').textContent()) !== '网络风险监控') throw new Error('Page heading was not rendered')

await page.locator('.risk-total__number').click()
await waitForDetails()
if (!(await page.locator('.detail-modal h2').textContent()).includes('40项')) throw new Error('Total-risk count is incorrect')
if ((await page.locator('tbody tr').count()) !== 10) throw new Error('First server page should render 10 rows')
if ((await page.locator('.number-cell').first().textContent()).trim() !== '1') throw new Error('First-page numbering is incorrect')

await page.locator('.page-button', { hasText: '2' }).click()
await waitForDetails()
if ((await page.locator('.number-cell').first().textContent()).trim() !== '11') throw new Error('Numbering should continue across server pages')

await page.locator('.page-button', { hasText: '1' }).click()
await waitForDetails()
await page.locator('.filter-button').first().click()
await page.locator('.filter-menu button').nth(1).click()
await waitForDetails()
if ((await page.locator('.pagination__total strong').textContent()).trim() !== '5') throw new Error('Server filter result count is incorrect')
await page.screenshot({ path: path.join(outputDir, 'desktop-server-pagination.png'), fullPage: true })

await page.locator('.icon-button').click()
await page.locator('.type-row').first().click()
await waitForDetails()
if (!(await page.locator('.detail-modal h2').textContent()).includes('配置类风险 · 11项')) throw new Error('Risk-type context is incorrect')

await page.locator('.icon-button').click()
await page.locator('.status-link--closed').click()
await waitForDetails()
if (!(await page.locator('.detail-modal h2').textContent()).includes('已关闭风险 · 16项')) throw new Error('Closed-risk context is incorrect')

await page.locator('.icon-button').click()
await page.locator('.ne-row').first().click()
await waitForDetails()
if (!(await page.locator('.detail-modal h2').textContent()).includes('AMF 网络风险 · 6项')) throw new Error('Network-element context is incorrect')

await page.locator('.icon-button').click()
await page.setViewportSize({ width: 390, height: 844 })
await page.reload({ waitUntil: 'networkidle' })
await page.locator('.risk-total__number').click()
await waitForDetails()
await page.screenshot({ path: path.join(outputDir, 'mobile-server-pagination.png'), fullPage: true })

console.log(JSON.stringify({ total: 40, filteredTotal: 5, numbering: '1 -> 11', screenshots: 2 }))
await browser.close()
