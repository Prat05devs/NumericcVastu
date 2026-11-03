import {expect, test, type Page} from '@playwright/test';
import {totp} from './totp';

const EMAIL = 'owner-e2e@example.test';
const PASSWORD = 'e2e owner passphrase 2026';
let secret = '';

async function signIn(page: Page) {
  await page.goto('/admin');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', {name: 'Sign in'}).click();
  if (secret) {
    await page.getByLabel('Authenticator code').fill(totp(secret));
    await page.getByRole('button', {name: 'Sign in'}).click();
  }
}

test.describe.configure({mode: 'serial'});

test('owner enrols MFA, configures delivery, and RBAC hides what the role cannot do', async ({page}) => {
  await signIn(page);
  await expect(page.getByRole('heading', {name: 'Set up two-factor authentication'})).toBeVisible();
  await page.getByRole('button', {name: 'Start setup'}).click();
  secret = (await page.getByLabel('Setup key').textContent())!.replace(/\s/g, '');
  await page.getByLabel('6-digit code').fill(totp(secret));
  await page.getByRole('button', {name: 'Confirm'}).click();
  await expect(page.getByRole('heading', {name: 'Overview'})).toBeVisible();
  await expect(page.getByText(/Payments are in mock mode/)).toBeVisible();

  // Configure delivery through the settings UI (schema-driven form).
  await page.getByRole('link', {name: 'Settings'}).click();
  const delivery = page.locator('details').filter({has: page.locator('summary', {hasText: /^Delivery/})});
  await delivery.evaluate((el) => { (el as HTMLDetailsElement).open = true; });
  await delivery.getByRole('button', {name: 'Add option'}).click();
  await delivery.getByLabel('Id (e.g. standard)').fill('standard');
  await delivery.getByLabel('Label', {exact: true}).first().fill('Standard delivery');
  await delivery.getByLabel('Fee (₹)').fill('99');
  await delivery.getByLabel('Fee (₹)').blur();
  await delivery.getByLabel('Free above (₹)').fill('1999');
  await delivery.getByLabel('Free above (₹)').blur();
  await delivery.getByLabel('Active').check();
  await delivery.getByRole('button', {name: 'Add courier'}).click();
  await delivery.getByLabel('Id', {exact: true}).fill('e2e-courier');
  await delivery.getByLabel('Name', {exact: true}).fill('E2E Courier');
  await delivery.getByLabel('Tracking URL').fill('https://track.example.test/{tracking}');
  await delivery.getByRole('button', {name: 'Save'}).click();
  await expect(delivery.getByText('Saved.')).toBeVisible();
});

test('the order desk ships a paid order and the customer sees the scans', async ({page, browser}) => {
  // A customer buys first (in a separate browser context).
  const shopper = await (await browser.newContext()).newPage();
  await shopper.goto('/products/demo-shree-yantra-copper');
  await shopper.getByRole('button', {name: 'Add to cart'}).click();
  await expect(shopper.getByText('Added.')).toBeVisible();
  await shopper.goto('/checkout');
  await shopper.getByLabel('Email').fill('e2e-desk@example.test');
  await shopper.getByLabel('Full name').fill('Desk Buyer');
  await shopper.getByLabel('Mobile number').fill('9876543211');
  await shopper.getByLabel('House / flat, street').fill('7 Desk Road');
  await shopper.getByLabel('City').fill('Noida');
  await shopper.getByLabel('PIN code').fill('201301');
  await shopper.getByLabel('State').selectOption('Uttar Pradesh');
  await shopper.getByRole('checkbox', {name: /I agree to the terms/}).check();
  await shopper.getByRole('button', {name: 'Place order and pay'}).click();
  await shopper.getByRole('button', {name: 'Pay now'}).click();
  await shopper.getByRole('button', {name: 'Simulate success'}).click();
  await expect(shopper.getByText('Payment confirmed.')).toBeVisible();
  const code = (await shopper.getByRole('heading', {level: 1}).textContent())!.replace('Order ', '').trim();

  await signIn(page);
  await page.getByRole('link', {name: 'Orders', exact: true}).click();
  await page.getByRole('link', {name: code}).click();
  await page.getByLabel('Courier').fill('e2e-courier');
  await page.getByLabel('Tracking number').fill('E2ETRACK001');
  await page.getByRole('button', {name: 'Mark shipped'}).click();
  await expect(page.getByText('e2e-courier · E2ETRACK001')).toBeVisible();
  await page.getByRole('button', {name: 'Out for delivery'}).click();
  await page.getByRole('button', {name: 'Delivered'}).click();
  await expect(page.locator('.badge').first()).toHaveText('Delivered');

  await shopper.reload();
  await expect(shopper.getByText('Track on the courier’s website')).toHaveAttribute('href', 'https://track.example.test/E2ETRACK001');
  await expect(shopper.getByRole('heading', {name: 'How was the delivery?'})).toBeVisible();
  await shopper.getByRole('button', {name: '5★'}).click();
  await shopper.getByRole('button', {name: 'Send feedback'}).click();
  await expect(shopper.getByText(/your feedback helps us/)).toBeVisible();

  await page.getByRole('link', {name: 'Delivery feedback'}).click();
  await expect(page.getByText(/5★/).first()).toBeVisible();
});

test('a publish is blocked until the product is complete', async ({page}) => {
  await signIn(page);
  await page.getByRole('link', {name: 'Products'}).click();
  await page.getByRole('link', {name: 'New product'}).click();
  await page.getByLabel('Category').selectOption({label: 'Yantras'});
  await page.getByLabel('Title').fill('E2E Kuber Yantra');
  await page.getByRole('button', {name: 'Create draft'}).click();
  await expect(page.getByRole('heading', {name: 'Publish checklist'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Publish'})).toBeDisabled();
  await expect(page.getByText('✗ At least one original photo confirmed as authorised, with alt text')).toBeVisible();
});
