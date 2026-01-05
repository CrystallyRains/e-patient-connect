#!/usr/bin/env tsx

import { displayDevSetup } from '../src/lib/utils/dev-setup'

async function main() {
  try {
    await displayDevSetup()
  } catch (error) {
    console.error('Failed to display dev setup:', error)
    process.exit(1)
  }
}

main()